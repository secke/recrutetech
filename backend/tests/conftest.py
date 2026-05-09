"""Shared pytest fixtures for the RecruteTech backend test suite.

Conventions:
- All DB tests use an in-memory SQLite engine (never the dev DB).
- No real Anthropic / ElevenLabs network calls: anthropic.AsyncAnthropic and
  anthropic.Anthropic are patched at the module level for every test session.
- Helper factories produce valid, minimal objects that pass all service-layer
  validation (weight sum = 1.0, ≥1 stage with duration ≤ role.duration_minutes,
  all required level_descriptors present).
"""
from __future__ import annotations

import json
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# ---------------------------------------------------------------------------
# In-memory SQLite engine — isolated per test session.
# StaticPool keeps the same connection across threads (needed by SQLModel).
# ---------------------------------------------------------------------------


@pytest.fixture(name="db_engine", scope="session")
def db_engine_fixture():
    """Create a shared in-memory SQLite engine for the test session."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Import all models so SQLModel metadata is populated before create_all.
    from app import models  # noqa: F401
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="db_session")
def db_session_fixture(db_engine) -> Generator[Session, None, None]:
    """Yield a fresh DB Session; roll back after each test for isolation."""
    with Session(db_engine) as session:
        yield session
        session.rollback()


# ---------------------------------------------------------------------------
# FastAPI TestClient with DB dependency overridden
# ---------------------------------------------------------------------------


@pytest.fixture(name="test_client")
def test_client_fixture(db_session: Session) -> Generator[TestClient, None, None]:
    """Build a synchronous TestClient with the test session injected."""
    from app.db import get_session
    from app.main import app

    def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    # Disable lifespan (init_db touches the real disk DB)
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------


def make_role(
    session: Session,
    *,
    title: str = "Backend Engineer",
    seniority: str = "senior",
    duration_minutes: int = 60,
    company: str = "Acme",
    language: str = "en",
) -> "app.models.Role":  # type: ignore[name-defined]
    from app.models import Role

    role = Role(
        title=title,
        seniority=seniority,
        duration_minutes=duration_minutes,
        company=company,
        language=language,
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def make_valid_rubric_json(
    *,
    skills: list[dict] | None = None,
    stages: list[dict] | None = None,
    language: str = "en",
    duration_target_minutes: int = 45,
    exclusions: dict | None = None,
) -> dict:
    """Return a complete rubric dict that passes validate_rubric cleanly.

    Default has 3 skills (weights 0.4 + 0.35 + 0.25 = 1.0) and 2 stages
    whose total duration (20 + 20 = 40 min) is within the default role
    duration (60 min).
    """
    if skills is None:
        skills = [
            {
                "id": "python_backend",
                "label": "Python backend depth",
                "weight": 0.40,
                "level_descriptors": {
                    "junior": "Knows syntax, writes basic endpoints with help.",
                    "mid": "Builds REST APIs independently, handles async patterns.",
                    "senior": "Designs services for scale, debugs production issues.",
                    "staff": "Sets technical direction, mentors others on advanced patterns.",
                },
                "must_probe": ["asyncio", "connection pooling", "deployment"],
            },
            {
                "id": "system_design",
                "label": "System design",
                "weight": 0.35,
                "level_descriptors": {
                    "junior": "Names basic components (DB, cache) without reasoning.",
                    "mid": "Draws a simple architecture, articulates one trade-off.",
                    "senior": "Multi-dimensional trade-offs, failure modes, capacity math.",
                    "staff": "Shapes org-wide technical strategy.",
                },
                "must_probe": ["caching", "database choice", "failure modes"],
            },
            {
                "id": "communication",
                "label": "Technical communication",
                "weight": 0.25,
                "level_descriptors": {
                    "junior": "Answers directly but struggles to explain trade-offs.",
                    "mid": "Structures answers clearly, asks clarifying questions.",
                    "senior": "Explains complex topics concisely, adapts to audience.",
                    "staff": "Drives alignment across stakeholders.",
                },
                "must_probe": ["explains trade-offs", "asks clarifying questions"],
            },
        ]

    if stages is None:
        stages = [
            {
                "id": "intro",
                "label": "Introduction",
                "duration_minutes": 10,
                "skills_evaluated": ["communication"],
                "opener": "Tell me about yourself and the project you are most proud of.",
            },
            {
                "id": "technical",
                "label": "Technical deep-dive",
                "duration_minutes": 30,
                "skills_evaluated": ["python_backend", "system_design"],
            },
        ]

    rubric: dict = {
        "role_title": "Backend Engineer",
        "seniority": "senior",
        "language_default": language,
        "duration_target_minutes": duration_target_minutes,
        "skills": skills,
        "stages": stages,
        "defense_questions": {
            "enabled": True,
            "min_per_session": 2,
            "max_per_session": 4,
        },
        "language_handling": {
            "candidate_can_switch_language": True,
            "score_unaffected_by_language_proficiency": True,
        },
    }
    if exclusions is not None:
        rubric["exclusions"] = exclusions

    return rubric


# ---------------------------------------------------------------------------
# Mock Anthropic client — prevents any real network calls.
# Patched at session scope so the lazy singleton in synthetic_runner / report_service
# never touches the real API. Individual tests can override the return values.
# ---------------------------------------------------------------------------

# Default stub tool_use content: scores that produce differentiation_ok=True.
# junior overall=2.0 (0-5 scale → 4.0/10), senior overall=4.5 (→ 9.0/10), spread=5.
_DEFAULT_SCORE_BLOCK = MagicMock(
    type="tool_use",
    name="emit_evaluation_report",
    input={
        "prompt_version": "2.0.0",
        "rubric_version_label": "test",
        "language": "en",
        "overall_score": 4.5,
        "skill_scores": {
            "python_backend": 4.5,
            "system_design": 4.5,
            "communication": 4.5,
        },
        "skill_assessments": [],
        "evidence": [{"skill_id": "python_backend", "citation": "test citation", "ts_ms": 0}],
        "summary": "Strong candidate.",
        "strengths": ["Good technical depth."],
        "gaps": [],
        "stage_notes": [{"stage_id": "intro", "observation": "Good intro."}],
        "communication": "Clear and structured.",
        "engagement": "Engaged throughout.",
        "recommendation": "yes",
        "candidate_letter": {
            "subject": "Your interview feedback",
            "body": "Thank you for interviewing. Here is your feedback.",
        },
    },
)


@pytest.fixture(autouse=True)
def mock_anthropic(monkeypatch):
    """Autouse fixture: patch anthropic clients so no real API calls are made.

    The default mock response has overall_score=4.5 on 0-5 scale per skill.
    Individual tests can override by re-patching the specific module.
    """
    mock_response = MagicMock()
    mock_response.content = [_DEFAULT_SCORE_BLOCK]
    mock_response.stop_reason = "tool_use"

    mock_async_create = AsyncMock(return_value=mock_response)
    mock_sync_create = MagicMock(return_value=mock_response)

    mock_async_client = MagicMock()
    mock_async_client.messages.create = mock_async_create

    mock_sync_client = MagicMock()
    mock_sync_client.messages.create = mock_sync_create

    mock_async_anthropic_cls = MagicMock(return_value=mock_async_client)
    mock_sync_anthropic_cls = MagicMock(return_value=mock_sync_client)

    monkeypatch.setattr("anthropic.AsyncAnthropic", mock_async_anthropic_cls)
    monkeypatch.setattr("anthropic.Anthropic", mock_sync_anthropic_cls)

    # Also reset any cached clients in synthetic_runner and report_service
    # so they pick up the mocked class on next call.
    import app.services.synthetic_runner as sr
    sr._async_client = None

    import app.services.report_service as rs
    rs._client = None

    return {
        "async_client": mock_async_client,
        "sync_client": mock_sync_client,
        "response": mock_response,
    }
