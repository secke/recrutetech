"""HR-side endpoints: list and inspect candidate interviews."""
import csv
import io
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.auth import require_hr_api_key
from app.db import get_session
from app.models import Interview, Role
from app.services.report_service import generate_report_for_interview

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
