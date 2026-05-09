"""Candidate-facing CV upload and personalization endpoints.

Two intake paths for the same CV:
  POST /api/interviews/{token}/cv        — multipart/form-data file upload (.pdf/.docx/.txt)
  POST /api/interviews/{token}/cv/text   — JSON body with raw text (LinkedIn paste etc.)

Both paths:
1. Gate on explicit Article 9 RGPD consent_processing=true.
2. Store cv_text + consent + timestamp.
3. Best-effort parse via Claude (returns 200 even if parsing fails).
4. Compose personalized Aria prompt and persist to interview.personalized_prompt.

Also exposes:
  GET  /api/interviews/{token}/cv-parsed  — return the structured parsed CV (if available).

RGPD: cv_text, cv_parsed_json, personalized_prompt are PII fields under
  Article 9 explicit consent. Retention: 90 days from cv_received_at.
  See backend/app/scripts/purge_expired_cv_text.py.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.config import settings
from app.db import get_session
from app.models import Interview, Role, Rubric
from app.services.cv_parsing_service import (
    CVParsedSchema,
    compose_personalized_prompt,
    extract_text_from_upload,
    parse_cv,
)
from app.services.rubric_service import get_active_rubric_for_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interviews", tags=["cv"])

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

_RGPD_CONSENT_ERROR = "Article 9 RGPD consent required for CV processing"

_PREVIEW_CHARS = 200

# Security HIGH-1 (2026-05-07): server-side cap on raw upload bytes; mirrors the
# 5 MB enforced in CVUpload.jsx. Prevents curl/tampered-client DoS and limits
# pypdf attack surface for crafted PDFs.
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class CVTextRequest(BaseModel):
    """Body for the JSON text intake endpoint."""
    text: str
    consent_processing: bool = False


class CVUploadResponse(BaseModel):
    ok: bool
    redactions_applied: list[str] = []
    preview: Optional[str] = None
    parsing_status: str = "ok"
    error_summary: Optional[str] = None


class CVParsedResponse(BaseModel):
    available: bool
    parsed: Optional[dict] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_interview_or_404(token: str, session: Session) -> Interview:
    iv = session.exec(select(Interview).where(Interview.public_token == token)).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    return iv


def _get_role_or_404(interview: Interview, session: Session) -> Role:
    role = session.get(Role, interview.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role for interview not found")
    return role


def _check_not_completed(interview: Interview) -> None:
    if interview.status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Cannot upload CV to a completed interview",
        )


def _check_no_existing_cv(interview: Interview) -> None:
    """Stop-gap rate limit (security HIGH-2): reject re-uploads when a CV is
    already on file. A real per-token / per-IP middleware limiter is tracked as
    a follow-up. To replace, the candidate must have the prior cv_text cleared
    by an admin (manual RGPD Art. 17 path)."""
    if interview.cv_text is not None:
        raise HTTPException(
            status_code=409,
            detail="CV already uploaded for this interview. Contact support to replace.",
        )


def _check_consent(consent_processing: bool) -> None:
    if not consent_processing:
        raise HTTPException(
            status_code=422,
            detail={"error": _RGPD_CONSENT_ERROR},
        )


async def _process_cv(
    interview: Interview,
    role: Role,
    raw_text: str,
    session: Session,
) -> CVUploadResponse:
    """Persist raw CV, attempt Claude parsing, compose personalized prompt.

    Always commits cv_text + consent fields. Best-effort for parsing:
    if parse_cv raises, we still return 200 with parsing_status='failed'.

    RGPD: cv_text stored under Article 9 explicit consent only (caller verified).
    """
    # RGPD: store raw CV text — consent already verified by caller.
    interview.cv_text = raw_text  # RGPD: PII, purge 90 days from cv_received_at
    interview.cv_consent_processing = True
    interview.cv_received_at = datetime.utcnow()

    # Attempt parsing (best-effort).
    parsed: Optional[CVParsedSchema] = None
    parsing_status = "ok"
    error_summary: Optional[str] = None

    role_hint = {"title": role.title, "seniority": role.seniority}

    try:
        parsed = await parse_cv(raw_text, role_hint=role_hint)
    except NotImplementedError as exc:
        parsing_status = "failed"
        error_summary = "CV parsing unavailable: prompt module not yet published."
        logger.warning(
            "cv.parse.not_implemented",
            extra={"interview_id": interview.id, "reason": str(exc)},
        )
    except Exception as exc:
        parsing_status = "failed"
        error_summary = f"CV parsing error: {type(exc).__name__}"
        logger.error(
            "cv.parse.error",
            extra={"interview_id": interview.id, "error_type": type(exc).__name__},
        )

    personalized: Optional[str] = None
    if parsed is not None:
        # RGPD: cv_parsed_json and personalized_prompt are PII; 90-day retention.
        interview.cv_parsed_json = json.dumps(parsed.model_dump())  # RGPD: PII, purge after 90 days

        active_rubric: Optional[Rubric] = None
        if role.id is not None:
            active_rubric = get_active_rubric_for_role(session, role.id)

        try:
            personalized = compose_personalized_prompt(role, parsed, rubric=active_rubric)
            interview.personalized_prompt = personalized  # RGPD: PII, purge after 90 days
        except Exception as exc:
            logger.error(
                "cv.compose_prompt.error",
                extra={"interview_id": interview.id, "error_type": type(exc).__name__},
            )

    session.add(interview)
    session.commit()
    session.refresh(interview)

    logger.info(
        "cv.uploaded",
        extra={
            "interview_id": interview.id,
            "parsing_status": parsing_status,
            "personalized": personalized is not None,
            "cv_personalization_inject": settings.CV_PERSONALIZATION_INJECT,
        },
    )

    return CVUploadResponse(
        ok=True,
        redactions_applied=parsed.redactions_applied if parsed else [],
        preview=personalized[:_PREVIEW_CHARS] if personalized else None,
        parsing_status=parsing_status,
        error_summary=error_summary,
    )


# ---------------------------------------------------------------------------
# POST /api/interviews/{token}/cv  — multipart/form-data file upload
# ---------------------------------------------------------------------------


@router.post(
    "/{token}/cv",
    response_model=CVUploadResponse,
    status_code=200,
    summary="Upload candidate CV (file)",
)
async def upload_cv_file(
    token: str,
    file: UploadFile = File(...),
    consent_processing: bool = Form(False),
    session: Session = Depends(get_session),
) -> CVUploadResponse:
    """Accept a .pdf, .docx, or .txt CV upload for the given interview token.

    consent_processing must be True (Article 9 RGPD explicit consent for AI processing).
    Returns 422 if consent is missing, 404 if interview not found,
    409 if interview is already completed.
    """
    _check_consent(consent_processing)
    interview = _get_interview_or_404(token, session)
    _check_not_completed(interview)
    _check_no_existing_cv(interview)
    role = _get_role_or_404(interview, session)

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )
    filename = file.filename or "upload.bin"

    try:
        raw_text = await extract_text_from_upload(filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return await _process_cv(interview, role, raw_text, session)


# ---------------------------------------------------------------------------
# POST /api/interviews/{token}/cv/text  — JSON body with raw text
# ---------------------------------------------------------------------------


@router.post(
    "/{token}/cv/text",
    response_model=CVUploadResponse,
    status_code=200,
    summary="Upload candidate CV (text/paste)",
)
async def upload_cv_text(
    token: str,
    payload: CVTextRequest,
    session: Session = Depends(get_session),
) -> CVUploadResponse:
    """Accept a pasted CV text (LinkedIn copy-paste, manual entry) for the given interview token.

    consent_processing must be True in the JSON body (Article 9 RGPD explicit consent).
    Returns 422 if consent is False or missing.
    """
    _check_consent(payload.consent_processing)
    interview = _get_interview_or_404(token, session)
    _check_not_completed(interview)
    _check_no_existing_cv(interview)
    role = _get_role_or_404(interview, session)

    raw_text = payload.text.strip()
    if not raw_text:
        raise HTTPException(status_code=422, detail="CV text cannot be empty")

    if len(raw_text) > 50_000:
        raise HTTPException(
            status_code=422,
            detail=(
                f"CV text is {len(raw_text)} chars, which exceeds the 50,000-char limit. "
                "This is almost certainly not a CV."
            ),
        )

    return await _process_cv(interview, role, raw_text, session)


# ---------------------------------------------------------------------------
# GET /api/interviews/{token}/cv-parsed  — return structured parsed CV
# ---------------------------------------------------------------------------


@router.get(
    "/{token}/cv-parsed",
    response_model=CVParsedResponse,
    summary="Get structured parsed CV for an interview",
)
def get_cv_parsed(
    token: str,
    session: Session = Depends(get_session),
) -> CVParsedResponse:
    """Return the structured cv_parsed_json for a given interview token.

    Returns {"available": false} if no CV has been parsed yet.
    This endpoint is intentionally unauthenticated (same as other screening endpoints)
    since it uses the opaque interview public_token as the access credential.
    """
    interview = _get_interview_or_404(token, session)
    if not interview.cv_parsed_json:
        return CVParsedResponse(available=False)

    try:
        parsed_dict = json.loads(interview.cv_parsed_json)
    except Exception:
        return CVParsedResponse(available=False)

    return CVParsedResponse(available=True, parsed=parsed_dict)
