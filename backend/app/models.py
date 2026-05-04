from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import secrets


def _token() -> str:
    return secrets.token_urlsafe(12)


class Role(SQLModel, table=True):
    """An interview template created by HR. Candidates apply via its public_token."""

    id: Optional[int] = Field(default=None, primary_key=True)
    public_token: str = Field(default_factory=_token, unique=True, index=True)

    title: str
    seniority: str  # junior | mid | senior | staff
    company: str = "Lumen Labs"
    duration_minutes: int = 45
    language: str = "fr"  # fr | en
    tone: str = "warm"    # warm | neutral | rigorous

    # JSON-encoded lists
    stages_json: str = "[]"
    skills_json: str = "[]"

    # Generated content used to override the ElevenLabs agent per session
    system_prompt: str = ""
    first_message: str = ""

    created_at: datetime = Field(default_factory=datetime.utcnow)


class Interview(SQLModel, table=True):
    """One candidate session against a Role."""

    id: Optional[int] = Field(default=None, primary_key=True)
    public_token: str = Field(default_factory=_token, unique=True, index=True)
    role_id: int = Field(foreign_key="role.id", index=True)

    candidate_name: str = ""
    candidate_email: str = ""

    elevenlabs_conversation_id: Optional[str] = Field(default=None, index=True)
    status: str = "pending"  # pending | in_progress | completed | error

    transcript_json: Optional[str] = None  # full transcript from webhook
    analysis_json: Optional[str] = None    # ElevenLabs analysis (summary, evaluation)
    visual_metrics_json: Optional[str] = None  # aggregated MediaPipe metrics
    report_json: Optional[str] = None      # Claude-generated HR report + candidate letter

    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
