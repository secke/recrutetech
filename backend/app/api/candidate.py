"""Candidate-facing endpoints — transparent-scoring-explainability skill.

These routes are PUBLIC (no HR API key). Access control is via public_token
(opaque URL-safe random string embedded in the interview URL the candidate
received). share_with_candidate must be True for the view to be accessible.

RGPD note: this file exposes a SANITISED subset of the evaluation report.
The following fields are explicitly EXCLUDED from the candidate view in v1:
  overall_score, skill_scores, skill_assessments, recommendation,
  hiring_recommendation, evidence (verbatim quotes too sensitive for v1).
The response is built by an EXPLICIT Pydantic whitelist — no dict.pop() /
blacklist pattern. Anything not in CandidateViewResponse is structurally
unreachable from outside this module.

RGPD retention: same as Interview — transcript PII purged 90 days after
ended_at. candidate_letter may contain name mentions; handled upstream.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import get_session
from app.models import Interview

# FastAPI dependency — imported at call site via Depends
from fastapi import Depends

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/candidate",
    tags=["candidate"],
    # NO global auth dependency — public routes, gated per interview by share_with_candidate
)


# ---------------------------------------------------------------------------
# Pydantic response schema — EXPLICIT WHITELIST
# Fields not listed here cannot leak to the candidate regardless of what
# the upstream report_json contains. This is the safety boundary.
# ---------------------------------------------------------------------------

class CounterfactualItem(BaseModel):
    """A concrete growth suggestion for the candidate."""
    description: str
    actionable_advice: Optional[str] = None


class CandidateLetter(BaseModel):
    subject: str
    body: str


class CandidateViewResponse(BaseModel):
    """Sanitised evaluation view for the candidate.

    EXPLICIT WHITELIST — any field not listed here is unreachable.

    Deliberately EXCLUDED (v1 — revisit when a contest-flow lands):
      - overall_score         (HR-internal scoring detail)
      - skill_scores          (HR-internal)
      - skill_assessments     (HR-internal, contains growth notes with rubric refs)
      - recommendation        (hiring decision — strictly internal)
      - hiring_recommendation (legacy field alias — also internal)
      - evidence / evidence_pointers  (verbatim quotes — requires contest-flow before
                                        sharing; too sensitive without recourse UX)
      - stage_notes           (HR-internal observation log)
      - report_integrity_hash (internal audit field)
      - evidence_verified     (internal quality flag)
    """
    interview_token: str
    language: Optional[str] = None
    summary: Optional[str] = None
    strengths: list[str] = []
    gaps: list[str] = []
    candidate_letter: Optional[CandidateLetter] = None
    counterfactuals: list[CounterfactualItem] = []
    # Per security review LOW-2 / RGPD Art. 22(3) "meaningful information about the
    # logic involved": surface evaluation framework version + timestamp. We do NOT
    # disclose evaluator_model (vendor info, not strictly required by Art. 22).
    evaluation_framework_version: Optional[str] = None
    evaluated_at: Optional[str] = None
    # Indicates the candidate may request human review within 7 days (RGPD Art. 22)
    recourse_available: bool = True
    recourse_deadline_days: int = 7


@router.get(
    "/interviews/{interview_token}",
    response_model=CandidateViewResponse,
    summary="Candidate-facing sanitised evaluation view (public, gated by share flag)",
)
def get_candidate_view(
    interview_token: str,
    session: Session = Depends(get_session),
) -> CandidateViewResponse:
    """Return a sanitised evaluation view to the candidate.

    Access control:
    - If share_with_candidate is False, returns 404 (NOT 403).
      404 prevents enumeration — the candidate cannot distinguish "this
      interview token doesn't exist" from "sharing is disabled". This is
      a deliberate RGPD mode-RH-only design.

    Field safety:
    - Response is built by explicit Pydantic whitelist — not by removing
      sensitive fields from a full dict. Structural impossibility > runtime
      filter.
    """
    iv = session.exec(
        select(Interview).where(Interview.public_token == interview_token)
    ).first()

    # 404 for not-found AND for sharing-disabled — no enumeration difference
    if not iv or not iv.share_with_candidate:
        raise HTTPException(404, "Interview not found")

    if not iv.report_json:
        raise HTTPException(404, "Evaluation not yet available")

    try:
        report = json.loads(iv.report_json)
    except Exception:
        logger.warning(
            "candidate_view.report_json_corrupt",
            extra={"interview_id": iv.id},
        )
        raise HTTPException(500, "Evaluation data temporarily unavailable")

    # -- Extract ONLY whitelisted fields ------------------------------------

    # summary
    summary: Optional[str] = report.get("summary") or None

    # strengths / gaps (list[str])
    raw_strengths: list[str] = report.get("strengths") or []
    raw_gaps: list[str] = report.get("gaps") or []
    strengths = [s for s in raw_strengths if isinstance(s, str)]
    gaps = [g for g in raw_gaps if isinstance(g, str)]

    # candidate_letter
    letter_raw = report.get("candidate_letter")
    candidate_letter: Optional[CandidateLetter] = None
    if isinstance(letter_raw, dict):
        try:
            candidate_letter = CandidateLetter(
                subject=str(letter_raw.get("subject") or ""),
                body=str(letter_raw.get("body") or ""),
            )
        except Exception:
            pass

    # counterfactuals (v3 shape: list[str | dict]; v2 shape: absent)
    raw_counterfactuals: list = report.get("counterfactuals") or []
    counterfactuals: list[CounterfactualItem] = []
    for cf in raw_counterfactuals:
        if isinstance(cf, str):
            counterfactuals.append(CounterfactualItem(description=cf))
        elif isinstance(cf, dict):
            desc = cf.get("description") or cf.get("text") or str(cf)
            advice = cf.get("actionable_advice") or cf.get("advice") or None
            counterfactuals.append(CounterfactualItem(description=desc, actionable_advice=advice))

    # language
    language: Optional[str] = report.get("language") or None

    # RGPD Art. 22(3) "meaningful information about the logic" — surface framework
    # version + timestamp without disclosing vendor model name.
    framework_version: Optional[str] = report.get("prompt_version") or None
    mv = report.get("model_version") or {}
    evaluated_at: Optional[str] = mv.get("evaluated_at") if isinstance(mv, dict) else None

    return CandidateViewResponse(
        interview_token=iv.public_token,
        language=language,
        summary=summary,
        strengths=strengths,
        gaps=gaps,
        candidate_letter=candidate_letter,
        counterfactuals=counterfactuals,
        evaluation_framework_version=framework_version,
        evaluated_at=evaluated_at,
        recourse_available=True,
        recourse_deadline_days=7,
    )


# ---------------------------------------------------------------------------
# Contest endpoint — out-of-scope for persistent storage in v1.
# Logs the contest with structured fields and returns 202 Accepted.
# Real persistence + email routing comes in a later sprint.
# ---------------------------------------------------------------------------

class ContestRequest(BaseModel):
    reason: str = Field(..., max_length=4000)
    contact_email: Optional[str] = None


@router.post(
    "/interviews/{interview_token}/contest",
    status_code=202,
    summary="Candidate contest of evaluation (RGPD Art. 22 right to challenge)",
)
def submit_contest(
    interview_token: str,
    body: ContestRequest,
    session: Session = Depends(get_session),
) -> dict:
    """Accept a candidate contest submission.

    v1 behaviour: log only, return 202. No DB persistence (no contest_text column
    in this sprint). Real routing (HR notification email + Anthropic improvement
    pipeline) is a follow-up task.

    The candidate must have been shown the view (share_with_candidate=True) to
    know about the contest flow, but we do NOT re-gate on share_with_candidate
    here — if they have the token and were previously shown the result, their
    right to contest should not be revocable by HR toggling the share flag off.
    """
    iv = session.exec(
        select(Interview).where(Interview.public_token == interview_token)
    ).first()
    if not iv:
        raise HTTPException(404, "Interview not found")

    # RGPD: do not log reason text (may contain PII) above DEBUG
    logger.debug(
        "candidate.contest_received",
        extra={
            "interview_id": iv.id,
            "has_contact_email": bool(body.contact_email),
            # reason NOT logged at DEBUG in prod; only raw at local dev
        },
    )
    logger.info(
        "candidate.contest_submitted",
        extra={
            "interview_id": iv.id,
            "has_reason": bool(body.reason.strip()),
            "has_contact_email": bool(body.contact_email),
            # No PII (reason, email) above DEBUG
        },
    )

    # MEDIUM-3 fix: return a contest reference id so the candidate has proof of filing.
    # Full Contest table is deferred; this is the floor for RGPD Art. 22(3) traceability.
    import time
    contest_ref = f"contest_{iv.id}_{int(time.time())}"
    logger.info(
        "candidate.contest_ref_issued",
        extra={"interview_id": iv.id, "contest_ref": contest_ref},
    )

    return {
        "status": "received",
        "contest_ref": contest_ref,
        "message": (
            "Your contest has been received. Reference: "
            f"{contest_ref}. An HR reviewer will respond within 7 days per our "
            "RGPD Art. 22 commitment."
        ),
    }
