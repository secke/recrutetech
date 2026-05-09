"""Candidate-facing endpoints: open a screening link, start a session."""
import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.db import get_session
from app.models import Interview, Role
from app.services.elevenlabs_service import get_signed_url
from app.services.report_service import generate_report_for_interview
from app.services.rubric_service import compose_aria_prompt, get_active_rubric_for_role

router = APIRouter(prefix="/api/screenings", tags=["screenings"])


class RolePublic(BaseModel):
    title: str
    seniority: str
    company: str
    duration_minutes: int
    language: str
    skills: list[str]


class StartRequest(BaseModel):
    candidate_name: str
    candidate_email: EmailStr


class SessionOverrides(BaseModel):
    """Mirror of the shape the @elevenlabs/react SDK expects under `overrides.agent`."""
    prompt: dict
    firstMessage: str
    language: str


class StartResponse(BaseModel):
    interview_token: str
    agent_id: str
    signed_url: str
    overrides: dict


@router.get("/{role_token}", response_model=RolePublic)
def get_role_for_screening(role_token: str, session: Session = Depends(get_session)) -> RolePublic:
    role = session.exec(select(Role).where(Role.public_token == role_token)).first()
    if not role:
        raise HTTPException(404, "Screening link not found or expired")
    return RolePublic(
        title=role.title,
        seniority=role.seniority,
        company=role.company,
        duration_minutes=role.duration_minutes,
        language=role.language,
        skills=json.loads(role.skills_json or "[]"),
    )


@router.post("/{role_token}/start", response_model=StartResponse)
async def start_screening(
    role_token: str,
    payload: StartRequest,
    session: Session = Depends(get_session),
) -> StartResponse:
    role = session.exec(select(Role).where(Role.public_token == role_token)).first()
    if not role:
        raise HTTPException(404, "Screening link not found or expired")

    if not settings.ELEVENLABS_AGENT_ID:
        raise HTTPException(503, "ElevenLabs agent not configured. Run the bootstrap script.")

    # -----------------------------------------------------------------
    # Rubric-routing: prefer an active structured rubric over the legacy
    # Role.system_prompt when one exists.
    #
    # Legacy path  (rubric=None):  use role.system_prompt — unchanged behaviour.
    # Rubric path  (rubric found): compose Aria prompt from rubric_json via
    #                              rubric_service.compose_aria_prompt(); set
    #                              interview.rubric_version_used_id so the report
    #                              service can later fetch and use the same rubric.
    # -----------------------------------------------------------------
    active_rubric = get_active_rubric_for_role(session, role.id)

    if active_rubric is not None:
        try:
            aria_system_prompt = compose_aria_prompt(active_rubric, cv_parsed=None)
        except NotImplementedError:
            # prompt-engineer's compose_aria_prompt_from_rubric not yet published.
            # Fall back to legacy path and log so we can monitor the gap.
            aria_system_prompt = role.system_prompt
            active_rubric = None  # treat as legacy for this session
            logger.info(
                "interview.rubric_prompt_fallback",
                extra={"role_id": role.id, "reason": "compose_aria_prompt_from_rubric not implemented"},
            )
    else:
        aria_system_prompt = role.system_prompt

    if active_rubric is None:
        logger.info(
            "interview.legacy_path",
            extra={"role_id": role.id},
        )

    # Phase 1 silent CV personalization: in this flow the Interview row is
    # created here, so cv_text is never present yet. The personalized prompt is
    # computed later by POST /api/interviews/{token}/cv. Phase 2 needs a flow
    # split (create-pending → upload-cv → ready-with-signed-url) before the
    # `interview.personalized_prompt` can be injected here. The settings flag
    # and hook below are scaffolding so Phase 2 only flips one branch.
    if settings.CV_PERSONALIZATION_INJECT:
        logger.info(
            "interview.cv_personalization.inject_flag_on",
            extra={"role_id": role.id, "note": "Phase 2 flow restructure required"},
        )

    interview = Interview(
        role_id=role.id,
        candidate_name=payload.candidate_name,
        candidate_email=str(payload.candidate_email),
        status="in_progress",
        started_at=datetime.utcnow(),
        rubric_version_used_id=active_rubric.id if active_rubric is not None else None,
    )
    session.add(interview)
    session.commit()
    session.refresh(interview)

    signed_url = await get_signed_url(settings.ELEVENLABS_AGENT_ID)

    return StartResponse(
        interview_token=interview.public_token,
        agent_id=settings.ELEVENLABS_AGENT_ID,
        signed_url=signed_url,
        overrides={
            "agent": {
                "prompt": {"prompt": aria_system_prompt},
                "firstMessage": role.first_message,
                "language": role.language,
            },
        },
    )


class ConversationLink(BaseModel):
    elevenlabs_conversation_id: str


@router.post("/{interview_token}/conversation")
def link_conversation(
    interview_token: str,
    payload: ConversationLink,
    session: Session = Depends(get_session),
):
    """Frontend tells us which ElevenLabs conversation_id this Interview is bound to,
    so the post-call webhook can match them up."""
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    iv.elevenlabs_conversation_id = payload.elevenlabs_conversation_id
    session.add(iv)
    session.commit()
    return {"ok": True}


class VisualMetricsPayload(BaseModel):
    eyeContactRatio: Optional[float] = None
    smileRatio: Optional[float] = None
    attentionRatio: Optional[float] = None
    blinkRate: Optional[float] = None
    headStability: Optional[float] = None


@router.post("/{interview_token}/visual-metrics")
def submit_visual_metrics(
    interview_token: str,
    payload: VisualMetricsPayload,
    session: Session = Depends(get_session),
):
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    iv.visual_metrics_json = json.dumps(payload.model_dump())
    session.add(iv)
    session.commit()
    return {"ok": True}


class TranscriptTurnIn(BaseModel):
    role: str           # "agent" | "user" | "ai" | "aria"
    text: str
    time_in_call_secs: Optional[float] = None


class TranscriptPayload(BaseModel):
    turns: List[TranscriptTurnIn]


@router.post("/{interview_token}/transcript")
def submit_transcript(
    interview_token: str,
    payload: TranscriptPayload,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Frontend-captured transcript fallback.

    The ElevenLabs post-call webhook is the canonical source of truth (it
    contains audio-derived punctuation and timing), but it requires a public
    backend URL and a few minutes to deliver. We accept the SDK-side
    transcript here so the report flow works in dev (and for any candidate
    where the webhook never lands). The webhook handler does not overwrite
    this if it arrives later — first writer wins.
    """
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")

    if not payload.turns:
        return {"ok": True, "note": "empty transcript ignored"}

    # Don't overwrite a transcript that's already been saved (from webhook or
    # an earlier submit). Otherwise we'd kick off a duplicate Claude call.
    if iv.transcript_json:
        return {"ok": True, "note": "transcript already saved"}

    iv.transcript_json = json.dumps([t.model_dump() for t in payload.turns])
    if iv.status == "in_progress":
        iv.status = "completed"
    iv.ended_at = iv.ended_at or datetime.utcnow()
    session.add(iv)
    session.commit()

    if iv.id is not None:
        background.add_task(generate_report_for_interview, iv.id)

    return {"ok": True, "queued_report": True}


@router.post("/{interview_token}/end")
def mark_ended(interview_token: str, session: Session = Depends(get_session)):
    """Called when the candidate hangs up. If the frontend already submitted
    a transcript, that path will have flipped the status. Otherwise this just
    marks the row completed and waits for the ElevenLabs webhook."""
    iv = session.exec(select(Interview).where(Interview.public_token == interview_token)).first()
    if not iv:
        raise HTTPException(404, "Interview not found")
    iv.ended_at = iv.ended_at or datetime.utcnow()
    if iv.status == "in_progress":
        iv.status = "completed"
    session.add(iv)
    session.commit()
    return {"ok": True}
