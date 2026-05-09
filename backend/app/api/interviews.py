"""HR-side endpoints: list and inspect candidate interviews."""
import csv
import io
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.core.auth import require_admin_or_hm, require_hr_api_key
from app.db import get_session
from app.models import EvaluationOverride, Interview, Role, Rubric
from app.services.report_service import (
    compute_integrity_hash,
    generate_report_for_interview,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/interviews",
    tags=["interviews"],
    dependencies=[Depends(require_hr_api_key)],
)

INTERVIEW_STATUSES = {"pending", "in_progress", "completed", "error"}


class InterviewSummary(BaseModel):
    id: int
    public_token: str
    role_title: str
    candidate_name: str
    candidate_email: str
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    overall_score: Optional[float] = None


class TranscriptTurn(BaseModel):
    role: str          # "agent" | "user"
    text: str
    time_in_call_secs: Optional[float] = None


class InterviewDetail(InterviewSummary):
    transcript: List[TranscriptTurn] = []
    analysis: Optional[dict] = None
    visual_metrics: Optional[dict] = None
    report: Optional[dict] = None  # Claude-generated HR report + candidate letter


def _summary(iv: Interview, role: Role) -> InterviewSummary:
    score: Optional[float] = None
    # Prefer the Claude-generated report's overall_score; fall back to ElevenLabs analysis.
    if iv.report_json:
        try:
            rep = json.loads(iv.report_json)
            if isinstance(rep.get("overall_score"), (int, float)):
                score = float(rep["overall_score"])
        except Exception:
            pass
    if score is None and iv.analysis_json:
        try:
            data = json.loads(iv.analysis_json)
            for k in ("overall_score", "score", "rating"):
                if k in data and isinstance(data[k], (int, float)):
                    score = float(data[k])
                    break
        except Exception:
            pass

    return InterviewSummary(
        id=iv.id,
        public_token=iv.public_token,
        role_title=role.title,
        candidate_name=iv.candidate_name,
        candidate_email=iv.candidate_email,
        status=iv.status,
        started_at=iv.started_at,
        ended_at=iv.ended_at,
        overall_score=score,
    )


@router.get("", response_model=List[InterviewSummary])
def list_interviews(
    role_id: Optional[int] = Query(None, description="Filter by Role.id"),
    status: Optional[str] = Query(None, description="pending | in_progress | completed | error"),
    session: Session = Depends(get_session),
) -> List[InterviewSummary]:
    if status and status not in INTERVIEW_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of {sorted(INTERVIEW_STATUSES)}")

    q = select(Interview).order_by(Interview.created_at.desc())
    if role_id is not None:
        q = q.where(Interview.role_id == role_id)
    if status:
        q = q.where(Interview.status == status)

    rows = session.exec(q).all()
    out: list[InterviewSummary] = []
    for iv in rows:
        role = session.get(Role, iv.role_id)
        if role is None:
            continue
        out.append(_summary(iv, role))
    return out


class RoleBreakdown(BaseModel):
    role_id: int
    title: str
    count: int


class InterviewStats(BaseModel):
    total: int
    by_status: Dict[str, int]
    by_role: List[RoleBreakdown]
    completed_last_7_days: int


@router.get("/stats", response_model=InterviewStats)
def get_stats(session: Session = Depends(get_session)) -> InterviewStats:
    rows = session.exec(select(Interview)).all()
    by_status: Dict[str, int] = {}
    by_role_counts: Dict[int, int] = {}
    cutoff = datetime.utcnow() - timedelta(days=7)
    last_7 = 0

    for iv in rows:
        by_status[iv.status] = by_status.get(iv.status, 0) + 1
        by_role_counts[iv.role_id] = by_role_counts.get(iv.role_id, 0) + 1
        if iv.status == "completed" and iv.ended_at and iv.ended_at >= cutoff:
            last_7 += 1

    by_role: List[RoleBreakdown] = []
    for rid, count in by_role_counts.items():
        role = session.get(Role, rid)
        if role:
            by_role.append(RoleBreakdown(role_id=rid, title=role.title, count=count))
    by_role.sort(key=lambda r: r.count, reverse=True)

    return InterviewStats(
        total=len(rows),
        by_status=by_status,
        by_role=by_role,
        completed_last_7_days=last_7,
    )


def _load_detail(interview_token: str, session: Session) -> tuple[Interview, Role, InterviewDetail]:
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    role = session.get(Role, iv.role_id)
    if not role:
        raise HTTPException(404, "Role for interview not found")

    base = _summary(iv, role)
    transcript: list[TranscriptTurn] = []
    if iv.transcript_json:
        try:
            for t in json.loads(iv.transcript_json):
                transcript.append(TranscriptTurn(
                    role=t.get("role", t.get("source", "agent")),
                    text=t.get("text", t.get("message", "")),
                    time_in_call_secs=t.get("time_in_call_secs"),
                ))
        except Exception:
            pass

    analysis: Optional[dict] = None
    if iv.analysis_json:
        try:
            analysis = json.loads(iv.analysis_json)
        except Exception:
            pass

    visual: Optional[dict] = None
    if iv.visual_metrics_json:
        try:
            visual = json.loads(iv.visual_metrics_json)
        except Exception:
            pass

    report: Optional[dict] = None
    if iv.report_json:
        try:
            report = json.loads(iv.report_json)
        except Exception:
            pass

    detail = InterviewDetail(
        **base.model_dump(),
        transcript=transcript,
        analysis=analysis,
        visual_metrics=visual,
        report=report,
    )
    return iv, role, detail


@router.get("/{interview_token}", response_model=InterviewDetail)
def get_interview(interview_token: str, session: Session = Depends(get_session)) -> InterviewDetail:
    _, _, detail = _load_detail(interview_token, session)
    return detail


def _csv_export(detail: InterviewDetail) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["section", "key", "value"])
    w.writerow(["meta", "interview_id", detail.id])
    w.writerow(["meta", "public_token", detail.public_token])
    w.writerow(["meta", "role_title", detail.role_title])
    w.writerow(["meta", "candidate_name", detail.candidate_name])
    w.writerow(["meta", "candidate_email", detail.candidate_email])
    w.writerow(["meta", "status", detail.status])
    w.writerow(["meta", "started_at", detail.started_at.isoformat() if detail.started_at else ""])
    w.writerow(["meta", "ended_at", detail.ended_at.isoformat() if detail.ended_at else ""])
    w.writerow(["meta", "overall_score", detail.overall_score if detail.overall_score is not None else ""])
    w.writerow([])

    if detail.visual_metrics:
        w.writerow(["visual_metric", "name", "value"])
        for k, v in detail.visual_metrics.items():
            w.writerow(["visual_metric", k, v if v is not None else ""])
        w.writerow([])

    w.writerow(["transcript", "time_in_call_secs", "role", "text"])
    for turn in detail.transcript:
        w.writerow([
            "transcript",
            turn.time_in_call_secs if turn.time_in_call_secs is not None else "",
            turn.role,
            turn.text,
        ])

    if detail.analysis:
        w.writerow([])
        w.writerow(["analysis_json"])
        w.writerow([json.dumps(detail.analysis, ensure_ascii=False)])

    if detail.report:
        w.writerow([])
        w.writerow(["report_json"])
        w.writerow([json.dumps(detail.report, ensure_ascii=False)])

    return buf.getvalue()


@router.post("/{interview_token}/generate-report", status_code=202)
def regenerate_report(
    interview_token: str,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
) -> dict:
    """Manually (re)trigger Claude report generation for an interview.

    Useful when the webhook fired before ANTHROPIC_API_KEY was configured, or
    when an early generation failed and you've since fixed the prompt.
    """
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    if not iv.transcript_json:
        raise HTTPException(409, "Interview has no transcript yet")
    if iv.id is None:
        raise HTTPException(500, "Interview missing id")
    background.add_task(generate_report_for_interview, iv.id)
    return {"queued": True}


@router.get("/{interview_token}/export")
def export_interview(
    interview_token: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    session: Session = Depends(get_session),
) -> Response:
    _, _, detail = _load_detail(interview_token, session)
    safe_token = detail.public_token
    if format == "csv":
        body = _csv_export(detail)
        return Response(
            content=body,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="interview_{safe_token}.csv"'},
        )
    body = json.dumps(detail.model_dump(mode="json"), ensure_ascii=False, indent=2, default=str)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="interview_{safe_token}.json"'},
    )


# ---------------------------------------------------------------------------
# transparent-scoring-explainability skill — new endpoints
# ---------------------------------------------------------------------------

# -- Audit trail ------------------------------------------------------------

class AuditTrailResponse(BaseModel):
    """Reproducible audit payload for external auditors.

    Per security review HIGH-2: raw transcript_json and visual_metrics_json are
    NOT returned (RGPD Art. 5(1)(c) data minimisation; Art. 9 special-category
    risk). The auditor receives SHA-256 digests of those inputs and must be
    supplied the raw inputs out-of-band under appropriate access controls
    (e.g. NDA + the existing HR detail route).

    Override sub-shape (canonical for hash recomputation):
        {id, skill_id, original_score, override_score, created_by, created_at}
    encoded with json.dumps(sort_keys=True, ensure_ascii=False).
    """
    interview_token: str
    rubric_id: Optional[int]
    rubric_version: Optional[int]
    prompt_version: Optional[str]
    evaluator_model: Optional[str]
    transcript_sha256: Optional[str]      # digest only; raw via HR detail route
    visual_metrics_sha256: Optional[str]  # digest only
    report_json: Optional[dict]
    overrides: List[dict]
    report_integrity_hash: Optional[str]
    verification_instructions: str = (
        "Obtain raw transcript_json and visual_metrics_json from the HR detail route "
        "(GET /api/interviews/{token}) under your NDA / access controls. "
        "Verify they hash to transcript_sha256 / visual_metrics_sha256 in this payload "
        "(SHA-256 of the UTF-8-encoded raw string). "
        "Then re-encode each of the eight canonical inputs "
        "(transcript_json, visual_metrics_json, rubric_id, rubric_version, "
        "prompt_version, evaluator_model, report_json [with report_integrity_hash key "
        "stripped], overrides) independently using json.dumps(value, sort_keys=True, "
        "ensure_ascii=False); join all eight encoded strings with a literal \\x00 byte; "
        "compute SHA-256 of the UTF-8 bytes. The digest must equal report_integrity_hash."
    )


@router.get(
    "/{interview_token}/audit-trail",
    response_model=AuditTrailResponse,
    summary="Full audit trail for external reproducibility (EU AI Act Art. 12)",
)
def get_audit_trail(
    interview_token: str,
    session: Session = Depends(get_session),
    _caller: str = Depends(require_admin_or_hm),
) -> AuditTrailResponse:
    """Return the complete audit payload so an external auditor can re-derive
    and verify the integrity hash from raw inputs.

    404 if no report has been generated yet.
    """
    iv = session.exec(
        select(Interview).where(Interview.public_token == interview_token)
    ).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    if not iv.report_json:
        raise HTTPException(404, "No report generated yet for this interview")

    # Parse report JSON for the response; strip integrity hash key per audit convention
    report_dict: Optional[dict] = None
    try:
        raw_report = json.loads(iv.report_json)
        report_dict = {k: v for k, v in raw_report.items() if k != "report_integrity_hash"}
    except Exception:
        pass

    # Resolve rubric metadata
    rubric_id: Optional[int] = None
    rubric_version: Optional[int] = None
    if iv.rubric_version_used_id is not None:
        rubric_row = session.get(Rubric, iv.rubric_version_used_id)
        if rubric_row:
            rubric_id = rubric_row.id
            rubric_version = rubric_row.version

    # Extract model metadata from the report (written at generation time)
    prompt_version: Optional[str] = None
    evaluator_model: Optional[str] = None
    if report_dict:
        prompt_version = report_dict.get("prompt_version")
        mv = report_dict.get("model_version") or {}
        evaluator_model = mv.get("evaluator_model") if isinstance(mv, dict) else None

    # Fetch all overrides for this interview (append-only log, ordered by created_at)
    override_rows = session.exec(
        select(EvaluationOverride)
        .where(EvaluationOverride.interview_id == iv.id)
        .order_by(EvaluationOverride.created_at)
    ).all()
    overrides_list: list[dict] = [
        {
            "id": row.id,
            "skill_id": row.skill_id,
            "original_score": row.original_score,
            "override_score": row.override_score,
            # justification is auditor-relevant but not PII — include it
            "justification": row.justification,
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in override_rows
    ]

    import hashlib
    transcript_sha = (
        hashlib.sha256(iv.transcript_json.encode("utf-8")).hexdigest()
        if iv.transcript_json else None
    )
    visual_sha = (
        hashlib.sha256(iv.visual_metrics_json.encode("utf-8")).hexdigest()
        if iv.visual_metrics_json else None
    )

    return AuditTrailResponse(
        interview_token=iv.public_token,
        rubric_id=rubric_id,
        rubric_version=rubric_version,
        prompt_version=prompt_version,
        evaluator_model=evaluator_model,
        transcript_sha256=transcript_sha,
        visual_metrics_sha256=visual_sha,
        report_json=report_dict,
        overrides=overrides_list,
        report_integrity_hash=iv.report_integrity_hash,
    )


# -- Override ---------------------------------------------------------------

class OverrideRequest(BaseModel):
    skill_id: str
    override_score: float = Field(..., ge=0.0, le=5.0)
    justification: str = Field(..., max_length=4000)

    @field_validator("justification")
    @classmethod
    def justification_min_length(cls, v: str) -> str:
        if len(v.strip()) < 30:
            raise ValueError(
                "justification must be at least 30 characters — "
                "required for RGPD Art. 22 and EU AI Act Art. 12 traceability"
            )
        return v


class OverrideResponse(BaseModel):
    override_id: int
    interview_token: str
    skill_id: str
    original_score: float
    override_score: float
    effective_score: float  # latest override wins per (interview_id, skill_id)
    justification: str
    created_by: str
    created_at: datetime
    report_integrity_hash: str


@router.post(
    "/{interview_token}/override",
    response_model=OverrideResponse,
    status_code=201,
    summary="HR override of a Claude-generated skill score (append-only audit log)",
)
def create_override(
    interview_token: str,
    body: OverrideRequest,
    session: Session = Depends(get_session),
    caller: str = Depends(require_admin_or_hm),
) -> OverrideResponse:
    """Insert a new EvaluationOverride row.

    APPEND-ONLY: prior overrides are never deleted or updated. Latest override
    wins for display purposes; the full history is available via audit-trail.

    The integrity hash is recomputed with the full override history so that
    auditors can verify the chain by re-hashing (report_json + all overrides).
    """
    iv = session.exec(
        select(Interview).where(Interview.public_token == interview_token)
    ).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    if not iv.report_json:
        raise HTTPException(409, "No report exists yet for this interview")

    try:
        report_dict = json.loads(iv.report_json)
    except Exception:
        raise HTTPException(500, "Report JSON is corrupt — cannot create override")

    # Validate that the skill_id exists in the report
    skill_scores: dict = report_dict.get("skill_scores") or {}
    if body.skill_id not in skill_scores:
        raise HTTPException(
            404,
            f"skill_id '{body.skill_id}' not found in report.skill_scores. "
            f"Available skills: {list(skill_scores.keys())}",
        )
    original_score: float = float(skill_scores[body.skill_id])

    # Insert the new override row
    override = EvaluationOverride(
        interview_id=iv.id,  # type: ignore[arg-type]
        skill_id=body.skill_id,
        original_score=original_score,
        override_score=body.override_score,
        justification=body.justification,
        created_by=caller,
    )
    session.add(override)
    session.flush()  # populate override.id before commit

    # Fetch all overrides for this interview (including the one just inserted)
    all_overrides = session.exec(
        select(EvaluationOverride)
        .where(EvaluationOverride.interview_id == iv.id)
        .order_by(EvaluationOverride.created_at)
    ).all()

    overrides_for_hash: list[dict] = [
        {
            "id": row.id,
            "skill_id": row.skill_id,
            "original_score": row.original_score,
            "override_score": row.override_score,
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in all_overrides
    ]

    # Resolve rubric metadata
    rubric_id: Optional[int] = None
    rubric_version_num: Optional[int] = None
    if iv.rubric_version_used_id is not None:
        rubric_row = session.get(Rubric, iv.rubric_version_used_id)
        if rubric_row:
            rubric_id = rubric_row.id
            rubric_version_num = rubric_row.version

    prompt_version: str = report_dict.get("prompt_version") or "unknown"
    mv = report_dict.get("model_version") or {}
    evaluator_model: str = (
        (mv.get("evaluator_model") if isinstance(mv, dict) else None)
        or "unknown"
    )

    # Recompute integrity hash with the new override history
    new_hash = compute_integrity_hash(
        transcript_json=iv.transcript_json,
        visual_metrics_json=iv.visual_metrics_json,
        rubric_id=rubric_id,
        rubric_version=rubric_version_num,
        prompt_version=prompt_version,
        evaluator_model=evaluator_model,
        report_json=report_dict,
        overrides=overrides_for_hash,
    )
    iv.report_integrity_hash = new_hash
    session.add(iv)
    session.commit()

    # Determine the effective score: latest override wins for this skill.
    # Tiebreaker on row.id (monotonic) per security review HIGH-1 — same
    # wall-clock created_at across two overrides would otherwise be nondeterministic.
    latest_for_skill = max(
        (row for row in all_overrides if row.skill_id == body.skill_id),
        key=lambda r: (r.created_at, r.id),
    )

    logger.info(
        "evaluation.override_created",
        extra={
            "interview_id": iv.id,
            "skill_id": body.skill_id,
            "override_id": override.id,
            "created_by": caller,
            # Do not log override_score or original_score at INFO — not PII but
            # keeping score details out of production logs is good practice.
        },
    )

    return OverrideResponse(
        override_id=override.id,  # type: ignore[arg-type]
        interview_token=iv.public_token,
        skill_id=body.skill_id,
        original_score=original_score,
        override_score=body.override_score,
        effective_score=latest_for_skill.override_score,
        justification=body.justification,
        created_by=caller,
        created_at=override.created_at,
        report_integrity_hash=new_hash,
    )


# -- Share with candidate ---------------------------------------------------

class ShareRequest(BaseModel):
    share_with_candidate: bool


class ShareResponse(BaseModel):
    interview_token: str
    share_with_candidate: bool
    updated_at: datetime


@router.patch(
    "/{interview_token}/share",
    response_model=ShareResponse,
    summary="HR opt-in/opt-out of sharing evaluation with the candidate",
)
def update_share(
    interview_token: str,
    body: ShareRequest,
    session: Session = Depends(get_session),
    caller: str = Depends(require_admin_or_hm),
) -> ShareResponse:
    """Set or clear the share_with_candidate flag.

    When True, the public candidate-view endpoint becomes accessible to the
    candidate via their public_token. Default is False (HR must explicitly opt in).

    Logging: structured event with caller identity, interview id, and new flag
    value. No transcript or score data logged above DEBUG.
    """
    iv = session.exec(
        select(Interview).where(Interview.public_token == interview_token)
    ).first()
    if not iv:
        raise HTTPException(404, "Interview not found")

    iv.share_with_candidate = body.share_with_candidate
    session.add(iv)
    session.commit()

    logger.info(
        "interview.share_updated",
        extra={
            "interview_id": iv.id,
            "share_with_candidate": body.share_with_candidate,
            "updated_by": caller,
        },
    )

    return ShareResponse(
        interview_token=iv.public_token,
        share_with_candidate=iv.share_with_candidate,
        updated_at=datetime.utcnow(),
    )
