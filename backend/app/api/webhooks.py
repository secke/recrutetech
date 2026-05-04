"""Receives ElevenLabs post-call webhook and saves transcript + analysis on the matching Interview."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlmodel import Session, select

from app.db import get_session
from app.models import Interview, Role
from app.services.elevenlabs_service import verify_webhook
from app.services.report_service import generate_report_for_interview

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/elevenlabs")
async def elevenlabs_webhook(
    request: Request,
    background: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="ElevenLabs-Signature"),
    session: Session = Depends(get_session),
):
    body = await request.body()

    # Skip verification if no secret is set (dev mode), but log loudly
    from app.core.config import settings
    if settings.ELEVENLABS_WEBHOOK_SECRET:
        if not verify_webhook(body, elevenlabs_signature):
            raise HTTPException(401, "Invalid webhook signature")
    else:
        print("⚠️  ELEVENLABS_WEBHOOK_SECRET not set — accepting webhook without verification")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")

    event_type = payload.get("type")
    data = payload.get("data", {})
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return {"ok": True, "note": "no conversation_id"}

    iv = session.exec(
        select(Interview).where(Interview.elevenlabs_conversation_id == conversation_id)
    ).first()
    if not iv:
        # Webhook arrived before frontend linked the conversation_id, or for an unknown agent
        return {"ok": True, "note": f"interview not found for conversation {conversation_id}"}

    if event_type in ("post_call_transcription", "post_call_audio"):
        transcript = data.get("transcript")
        if transcript is not None:
            iv.transcript_json = json.dumps(transcript)
        analysis = data.get("analysis")
        if analysis is not None:
            iv.analysis_json = json.dumps(analysis)
        was_already_completed = iv.status == "completed"
        iv.status = "completed"
        iv.ended_at = iv.ended_at or datetime.utcnow()
        session.add(iv)
        session.commit()

        # Queue Claude-powered report generation. The task itself sends the
        # personalized improvement letter to the candidate (or falls back to a
        # generic thank-you on failure). Skip on re-deliveries so we don't
        # email the same candidate twice.
        if not was_already_completed and iv.transcript_json and iv.id is not None:
            background.add_task(generate_report_for_interview, iv.id)

    return {"ok": True}
