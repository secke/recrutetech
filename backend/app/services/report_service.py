"""Generates the post-interview HR report + candidate improvement letter
from the ElevenLabs transcript and MediaPipe visual metrics.

Architecture:
- Claude Opus 4.7 (the platform's most capable model) with adaptive thinking
- Structured outputs via JSON schema — guarantees a parseable shape
- Single API call returns both the HR-facing JSON *and* the candidate letter
- Run as a FastAPI BackgroundTask off the post-call webhook
"""
from __future__ import annotations

import json
from typing import Any, Optional

from sqlmodel import Session

from app.core.config import settings
from app.db import engine
from app.models import Interview, Role
from app.services.email_service import (
    candidate_completion_email,
    send_email,
)


# ---------------------------------------------------------------------------
# Prompt + schema
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the senior recruiter analyst at RecruteTech, an AI-based visual recruiter platform (Mercor-like) focused on the francophone African market. Your job is to save time for both HR and candidates by producing a useful, fair evaluation of an autonomous interview Aria (the AI interviewer) has just conducted.

You will receive:
- Role context (title, seniority, company, target language, expected skills, planned stages)
- Full transcript of the conversation between Aria and the candidate
- Aggregated visual engagement metrics from the candidate's webcam (eye contact ratio, smile ratio, attention ratio, blink rate, head stability) — all best-effort signals, not ground truth

Produce two outputs in a SINGLE structured JSON response:

1) HR-facing evaluation:
   - overall_score (0.0-10.0)
   - summary (2-4 sentences for the recruiter)
   - strengths (concrete, with examples from the transcript)
   - gaps (concrete, with examples — be honest but professional)
   - skill_assessments (per-skill score + 1-2 line note)
   - stage_notes (per-stage observation: intro, experience, technical, code, etc.)
   - communication (clarity, structure, language proficiency)
   - engagement (how present/engaged the candidate seemed; weight visual signals lightly — they vary across cultures and individuals)
   - hiring_recommendation: one of strong_yes | yes | maybe | no | strong_no

2) Candidate-facing improvement letter:
   - Warm, encouraging tone — this person took time to interview
   - Written ENTIRELY in the candidate's interview language (`fr` or `en`)
   - 3-6 specific, actionable recommendations they can apply to their NEXT interview
   - Frame as growth, never judgment
   - NEVER reveal the score, recommendation, or HR analysis labels
   - Subject line should be encouraging and refer to the role they interviewed for

Anchor every observation in something the candidate actually said or did. If the transcript is too short or empty, say so honestly in the summary and lower the overall_score appropriately.
"""

REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_score": {"type": "number"},
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "gaps": {"type": "array", "items": {"type": "string"}},
        "skill_assessments": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {"type": "string"},
                    "score": {"type": "number"},
                    "notes": {"type": "string"},
                },
                "required": ["skill", "score", "notes"],
            },
        },
        "stage_notes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "stage": {"type": "string"},
                    "observation": {"type": "string"},
                },
                "required": ["stage", "observation"],
            },
        },
        "communication": {"type": "string"},
        "engagement": {"type": "string"},
        "hiring_recommendation": {
            "type": "string",
            "enum": ["strong_yes", "yes", "maybe", "no", "strong_no"],
        },
        "candidate_letter": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["subject", "body"],
        },
    },
    "required": [
        "overall_score", "summary", "strengths", "gaps",
        "skill_assessments", "stage_notes", "communication",
        "engagement", "hiring_recommendation", "candidate_letter",
    ],
}


# ---------------------------------------------------------------------------
# Anthropic client (lazy)
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic
        _client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _is_configured() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


# ---------------------------------------------------------------------------
# Prompt builder + Claude call
# ---------------------------------------------------------------------------

def _build_user_message(role: Role, iv: Interview) -> str:
    transcript = []
    if iv.transcript_json:
        try:
            for t in json.loads(iv.transcript_json):
                speaker = t.get("role") or t.get("source") or "agent"
                text = t.get("text") or t.get("message") or ""
                if not text:
                    continue
                speaker_label = "Aria" if speaker in ("agent", "ai", "aria") else "Candidate"
                ts = t.get("time_in_call_secs")
                prefix = f"[{int(ts)}s] " if isinstance(ts, (int, float)) else ""
                transcript.append(f"{prefix}{speaker_label}: {text}")
        except Exception:
            pass
    transcript_block = "\n".join(transcript) or "(empty transcript)"

    visual_block = "(no visual metrics captured)"
    if iv.visual_metrics_json:
        try:
            vm = json.loads(iv.visual_metrics_json)
            lines = []
            for k, v in vm.items():
                if v is None:
                    continue
                if isinstance(v, float) and 0 <= v <= 1:
                    lines.append(f"- {k}: {v:.0%}")
                else:
                    lines.append(f"- {k}: {v}")
            if lines:
                visual_block = "\n".join(lines)
        except Exception:
            pass

    skills = []
    try:
        skills = json.loads(role.skills_json or "[]")
    except Exception:
        pass
    stages = []
    try:
        stages = json.loads(role.stages_json or "[]")
    except Exception:
        pass

    return (
        f"# Role context\n"
        f"- Title: {role.title}\n"
        f"- Seniority: {role.seniority}\n"
        f"- Company: {role.company}\n"
        f"- Planned duration: {role.duration_minutes} minutes\n"
        f"- Interview language: {role.language}\n"
        f"- Expected skills: {', '.join(skills) if skills else '(unspecified)'}\n"
        f"- Planned stages: {', '.join(stages) if stages else '(unspecified)'}\n\n"
        f"# Candidate\n"
        f"- Name: {iv.candidate_name or '(unknown)'}\n\n"
        f"# Transcript\n{transcript_block}\n\n"
        f"# Visual engagement metrics\n{visual_block}\n\n"
        f"Produce the structured JSON report. Write the candidate_letter in `{role.language}`."
    )


def _generate(role: Role, iv: Interview) -> Optional[dict]:
    if not _is_configured():
        print("⚠️  ANTHROPIC_API_KEY not set — skipping report generation")
        return None

    client = _get_client()
    user_message = _build_user_message(role, iv)

    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            output_config={
                "format": {"type": "json_schema", "schema": REPORT_SCHEMA}
            },
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as e:
        print(f"❌ Claude report call failed: {e}")
        return None

    text_parts = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    raw = "".join(text_parts).strip()
    if not raw:
        print("❌ Claude returned no text content")
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"❌ Claude report JSON parse failed: {e}\n--- raw ---\n{raw[:500]}")
        return None


# ---------------------------------------------------------------------------
# Public entry point — used as a FastAPI BackgroundTask
# ---------------------------------------------------------------------------

def generate_report_for_interview(interview_id: int) -> None:
    """Background-task entry point: load → generate → save → email candidate.

    Designed to be safe to retry: skips if no transcript, falls back to a
    static thank-you email if the Claude call or parse fails.
    """
    with Session(engine) as session:
        iv = session.get(Interview, interview_id)
        if iv is None:
            print(f"ℹ️  generate_report: interview {interview_id} not found")
            return
        if not iv.transcript_json:
            print(f"ℹ️  generate_report: interview {interview_id} has no transcript yet")
            return
        role = session.get(Role, iv.role_id)
        if role is None:
            print(f"ℹ️  generate_report: role for interview {interview_id} missing")
            return

        report = _generate(role, iv)
        sent_personalized = False

        if report is not None:
            iv.report_json = json.dumps(report, ensure_ascii=False)
            session.add(iv)
            session.commit()

            letter = report.get("candidate_letter") or {}
            subject = (letter.get("subject") or "").strip()
            body = (letter.get("body") or "").strip()
            if iv.candidate_email and subject and body:
                sent_personalized = send_email(to=iv.candidate_email, subject=subject, body=body)

        if not sent_personalized and iv.candidate_email:
            subject, body = candidate_completion_email(
                candidate_name=iv.candidate_name,
                role_title=role.title,
                company=role.company,
                language=role.language,
            )
            send_email(to=iv.candidate_email, subject=subject, body=body)
