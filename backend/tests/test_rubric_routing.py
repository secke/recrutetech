"""Tests for rubric-routing: interview creation hook and report generation path selection.

Coverage:
1. Interview creation WITH active rubric → interview.rubric_version_used_id is set;
   "interview.legacy_path" log line NOT emitted.
2. Interview creation WITHOUT active rubric → rubric_version_used_id is None;
   "interview.legacy_path" IS emitted.
3. Report generation — rubric path: Interview with rubric_version_used_id set →
   Claude is called with EVALUATION_SYSTEM_PROMPT; report has prompt_version="2.0.0".
4. Report generation — legacy path: Interview with rubric_version_used_id=None →
   Claude is called with LEGACY_SYSTEM_PROMPT; report has prompt_version="1.0.0-legacy".

Notes on test design:
- Screenings endpoint calls get_signed_url(ELEVENLABS_AGENT_ID) which is async and
  hits the network. We patch it at the module level to avoid real HTTP calls.
- ELEVENLABS_AGENT_ID must be non-empty to avoid the 503 guard. We monkeypatch settings.
- generate_report_for_interview opens its own Session(engine) internally, so we cannot
  inject the test db_session. Instead we test _generate() directly, which takes role/
  interview objects and a Sync Anthropic client — cleanly decoupled from DB I/O.
- compose_aria_prompt raises NotImplementedError (prompt_builder not yet published),
  so the screenings endpoint falls back to the legacy aria path. The rubric FK is still
  set, however — that is what we validate. We patch compose_aria_prompt to NOT raise
  for the rubric-path scenario.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch, call as mock_call

import pytest
from sqlmodel import Session

from app.models import Interview, Role, Rubric
from app.services.report_service import (
    EVALUATION_SYSTEM_PROMPT,
    LEGACY_PROMPT_VERSION,
    LEGACY_SYSTEM_PROMPT,
    _generate,
)
from app.services.prompts.evaluation import EVALUATION_PROMPT_VERSION
from tests.conftest import make_role, make_valid_rubric_json


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_active_rubric(session: Session, role: Role) -> Rubric:
    """Create and activate a rubric for the given role (bypasses the 'must be tested' gate
    by writing test_results_json directly — valid for routing tests that don't exercise
    the activation service layer itself)."""
    from datetime import timezone
    rubric = Rubric(
        role_id=role.id,
        version=1,
        is_active=True,  # directly active for test setup
        name="Test Rubric v1",
        rubric_json=json.dumps(make_valid_rubric_json()),
        created_by="hr@test.com",
        created_at=datetime.utcnow(),
        last_tested_at=datetime.utcnow(),
        test_results_json=json.dumps({
            "tested_at": datetime.now(timezone.utc).isoformat(),
            "simulations": [],
            "differentiation_ok": True,
            "warnings": [],
        }),
    )
    session.add(rubric)
    session.commit()
    session.refresh(rubric)
    return rubric


def _make_interview_with_transcript(
    session: Session,
    role: Role,
    rubric_version_used_id: int | None = None,
) -> Interview:
    """Persist an Interview row with a minimal transcript."""
    iv = Interview(
        role_id=role.id,
        candidate_name="Test Candidate",
        candidate_email="candidate@test.com",
        status="completed",
        started_at=datetime.utcnow(),
        ended_at=datetime.utcnow(),
        rubric_version_used_id=rubric_version_used_id,
        transcript_json=json.dumps([
            {"role": "agent", "text": "Tell me about yourself.", "time_in_call_secs": 0},
            {"role": "user", "text": "I have 5 years of Python experience.", "time_in_call_secs": 3},
            {"role": "agent", "text": "Describe your async experience.", "time_in_call_secs": 30},
            {"role": "user", "text": "I use asyncio heavily for I/O bound tasks.", "time_in_call_secs": 35},
            {"role": "agent", "text": "What is your approach to system design?", "time_in_call_secs": 90},
            {"role": "user", "text": "I start from requirements and work top-down.", "time_in_call_secs": 95},
        ]),
    )
    session.add(iv)
    session.commit()
    session.refresh(iv)
    return iv


# ---------------------------------------------------------------------------
# 1. Interview creation with active rubric
# ---------------------------------------------------------------------------


class TestInterviewCreationWithActiveRubric:
    def test_rubric_version_used_id_is_set_when_active_rubric_exists(
        self, test_client, db_session: Session, monkeypatch, caplog
    ):
        """POST /api/screenings/{role_token}/start with an active rubric → Interview.rubric_version_used_id set."""
        role = make_role(db_session)
        active_rubric = _make_active_rubric(db_session, role)

        # Patch compose_aria_prompt to not raise NotImplementedError (simulates prompt-engineer having shipped)
        monkeypatch.setattr(
            "app.api.screenings.compose_aria_prompt",
            lambda rubric, cv_parsed=None: "Mocked Aria prompt from rubric",
        )

        # Patch get_signed_url and settings.ELEVENLABS_AGENT_ID
        monkeypatch.setattr("app.core.config.settings.ELEVENLABS_AGENT_ID", "fake-agent-id")
        monkeypatch.setattr(
            "app.api.screenings.get_signed_url",
            AsyncMock(return_value="wss://fake.elevenlabs.io/test"),
        )

        with caplog.at_level(logging.INFO):
            resp = test_client.post(
                f"/api/screenings/{role.public_token}/start",
                json={"candidate_name": "Alice", "candidate_email": "alice@example.com"},
            )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        # Find the created interview and check the FK
        from sqlmodel import select
        iv = db_session.exec(
            select(Interview).where(Interview.role_id == role.id)
        ).first()
        assert iv is not None, "Interview was not created"
        assert iv.rubric_version_used_id == active_rubric.id, (
            f"Expected rubric_version_used_id={active_rubric.id}, "
            f"got {iv.rubric_version_used_id}"
        )

        # "interview.legacy_path" must NOT be in the logs
        legacy_logged = any("interview.legacy_path" in r.message for r in caplog.records)
        assert not legacy_logged, (
            "Expected 'interview.legacy_path' NOT to be logged when active rubric exists, "
            f"but got logs: {[r.message for r in caplog.records]}"
        )


# ---------------------------------------------------------------------------
# 2. Interview creation WITHOUT active rubric
# ---------------------------------------------------------------------------


class TestInterviewCreationWithoutActiveRubric:
    def test_rubric_version_used_id_is_none_without_active_rubric(
        self, test_client, db_session: Session, monkeypatch, caplog
    ):
        """POST /api/screenings/{role_token}/start without any active rubric → rubric_version_used_id=None."""
        role = make_role(db_session)
        # No rubric created for this role

        monkeypatch.setattr("app.core.config.settings.ELEVENLABS_AGENT_ID", "fake-agent-id")
        monkeypatch.setattr(
            "app.api.screenings.get_signed_url",
            AsyncMock(return_value="wss://fake.elevenlabs.io/test"),
        )

        with caplog.at_level(logging.INFO):
            resp = test_client.post(
                f"/api/screenings/{role.public_token}/start",
                json={"candidate_name": "Bob", "candidate_email": "bob@example.com"},
            )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        from sqlmodel import select
        iv = db_session.exec(
            select(Interview).where(Interview.role_id == role.id)
        ).first()
        assert iv is not None, "Interview was not created"
        assert iv.rubric_version_used_id is None, (
            f"Expected rubric_version_used_id=None (no active rubric), "
            f"got {iv.rubric_version_used_id}"
        )

        # "interview.legacy_path" MUST appear in the logs
        legacy_logged = any("interview.legacy_path" in r.message for r in caplog.records)
        assert legacy_logged, (
            "Expected 'interview.legacy_path' to be logged when no active rubric exists. "
            f"Got logs: {[r.message for r in caplog.records]}"
        )


# ---------------------------------------------------------------------------
# 3. Report generation — rubric path
# ---------------------------------------------------------------------------


class TestReportGenerationRubricPath:
    def test_rubric_path_uses_evaluation_system_prompt(
        self, db_session: Session, monkeypatch
    ):
        """_generate() with rubric_dict provided → Anthropic called with EVALUATION_SYSTEM_PROMPT."""
        role = make_role(db_session)
        iv = _make_interview_with_transcript(db_session, role)
        rubric_dict = make_valid_rubric_json()

        # Capture what system prompt was passed to client.messages.create
        captured_system: list = []

        def _fake_create(**kwargs):
            captured_system.append(kwargs.get("system"))
            # Build a mock response with the rubric-path tool_use block
            block = MagicMock()
            block.type = "tool_use"
            block.name = "emit_evaluation_report"
            block.input = {
                "prompt_version": EVALUATION_PROMPT_VERSION,
                "rubric_version_label": "Test Rubric v1",
                "language": "en",
                "overall_score": 7.5,
                "skill_scores": {"python_backend": 3.5, "system_design": 3.0, "communication": 4.0},
                "skill_assessments": [],
                "evidence": [{"skill_id": "python_backend", "citation": "asyncio", "ts_ms": 35000}],
                "summary": "Strong candidate.",
                "strengths": ["Good asyncio knowledge."],
                "gaps": [],
                "stage_notes": [{"stage_id": "intro", "observation": "Good."}],
                "communication": "Clear.",
                "engagement": "Engaged.",
                "recommendation": "yes",
                "candidate_letter": {
                    "subject": "Your feedback",
                    "body": "Thank you for interviewing with us. Here is your feedback.",
                },
            }
            mock_resp = MagicMock()
            mock_resp.content = [block]
            mock_resp.stop_reason = "tool_use"
            return mock_resp

        mock_sync_client = MagicMock()
        mock_sync_client.messages.create.side_effect = _fake_create

        # Patch the Anthropic class used by report_service
        monkeypatch.setattr("anthropic.Anthropic", MagicMock(return_value=mock_sync_client))
        # Force a fresh client (autouse fixture may have set it to None already, but be safe)
        import app.services.report_service as rs
        rs._client = None
        # Set ANTHROPIC_API_KEY so _is_configured() returns True
        monkeypatch.setattr("app.core.config.settings.ANTHROPIC_API_KEY", "test-key")

        report = _generate(role, iv, rubric_dict=rubric_dict, rubric_version_label="Test Rubric v1")

        assert report is not None, "_generate() returned None — check mock setup"
        assert len(captured_system) == 1, f"Expected 1 Claude call, got {len(captured_system)}"

        # System must be the rubric-anchored prompt (as list with type/text/cache_control)
        system_arg = captured_system[0]
        assert isinstance(system_arg, list), f"Expected system to be a list, got {type(system_arg)}"
        system_text = system_arg[0]["text"] if isinstance(system_arg[0], dict) else str(system_arg[0])
        # The distinctive substring from EVALUATION_SYSTEM_PROMPT
        assert "rubric" in system_text.lower() or EVALUATION_SYSTEM_PROMPT[:40] in system_text, (
            f"Captured system prompt does not match EVALUATION_SYSTEM_PROMPT. "
            f"Got first 100 chars: {system_text[:100]}"
        )

    def test_rubric_path_report_has_correct_prompt_version(
        self, db_session: Session, monkeypatch
    ):
        """Report returned by rubric path must have prompt_version='2.0.0'."""
        role = make_role(db_session)
        iv = _make_interview_with_transcript(db_session, role)
        rubric_dict = make_valid_rubric_json()

        def _fake_create(**kwargs):
            block = MagicMock()
            block.type = "tool_use"
            block.name = "emit_evaluation_report"
            block.input = {
                "prompt_version": EVALUATION_PROMPT_VERSION,
                "rubric_version_label": "Test v1",
                "language": "en",
                "overall_score": 8.0,
                "skill_scores": {"python_backend": 4.0, "system_design": 4.0, "communication": 4.0},
                "skill_assessments": [],
                "evidence": [{"skill_id": "python_backend", "citation": "asyncio", "ts_ms": 0}],
                "summary": "Strong.",
                "strengths": ["Good."],
                "gaps": [],
                "stage_notes": [{"stage_id": "intro", "observation": "Good."}],
                "communication": "Clear.",
                "engagement": "Engaged.",
                "recommendation": "yes",
                "candidate_letter": {"subject": "Thanks", "body": "Thank you for interviewing."},
            }
            mock_resp = MagicMock()
            mock_resp.content = [block]
            mock_resp.stop_reason = "tool_use"
            return mock_resp

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = _fake_create
        monkeypatch.setattr("anthropic.Anthropic", MagicMock(return_value=mock_client))
        import app.services.report_service as rs
        rs._client = None
        monkeypatch.setattr("app.core.config.settings.ANTHROPIC_API_KEY", "test-key")

        report = _generate(role, iv, rubric_dict=rubric_dict)

        assert report is not None
        assert report.get("prompt_version") == EVALUATION_PROMPT_VERSION, (
            f"Expected prompt_version='{EVALUATION_PROMPT_VERSION}' for rubric path, "
            f"got {report.get('prompt_version')}"
        )


# ---------------------------------------------------------------------------
# 4. Report generation — legacy path
# ---------------------------------------------------------------------------


class TestReportGenerationLegacyPath:
    def test_legacy_path_uses_legacy_system_prompt(
        self, db_session: Session, monkeypatch
    ):
        """_generate() with rubric_dict=None → Anthropic called with LEGACY_SYSTEM_PROMPT."""
        role = make_role(db_session)
        iv = _make_interview_with_transcript(db_session, role, rubric_version_used_id=None)

        captured_system: list = []

        def _fake_create(**kwargs):
            captured_system.append(kwargs.get("system"))
            # Legacy path returns text content (not tool_use)
            text_block = MagicMock()
            text_block.type = "text"
            text_block.text = json.dumps({
                "overall_score": 6.0,
                "summary": "Decent candidate.",
                "strengths": ["Good communication."],
                "gaps": ["Lacks system design depth."],
                "skill_assessments": [],
                "stage_notes": [],
                "communication": "Clear.",
                "engagement": "Engaged.",
                "hiring_recommendation": "maybe",
                "candidate_letter": {
                    "subject": "Your interview feedback",
                    "body": "Thank you for interviewing with us today.",
                },
            })
            mock_resp = MagicMock()
            mock_resp.content = [text_block]
            mock_resp.stop_reason = "end_turn"
            return mock_resp

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = _fake_create
        monkeypatch.setattr("anthropic.Anthropic", MagicMock(return_value=mock_client))
        import app.services.report_service as rs
        rs._client = None
        monkeypatch.setattr("app.core.config.settings.ANTHROPIC_API_KEY", "test-key")

        report = _generate(role, iv, rubric_dict=None)

        assert report is not None, "_generate() returned None — check mock setup"
        assert len(captured_system) == 1, f"Expected 1 Claude call, got {len(captured_system)}"

        system_arg = captured_system[0]
        # Legacy system is also passed as a list with cache_control
        assert isinstance(system_arg, list), f"Expected system to be a list, got {type(system_arg)}"
        system_text = system_arg[0]["text"] if isinstance(system_arg[0], dict) else str(system_arg[0])

        # The distinctive substring from LEGACY_SYSTEM_PROMPT
        assert "legacy" in system_text.lower() or "senior recruiter" in system_text.lower() or LEGACY_SYSTEM_PROMPT[:40] in system_text, (
            f"Captured system prompt does not match LEGACY_SYSTEM_PROMPT. "
            f"Got first 100 chars: {system_text[:100]}"
        )

    def test_legacy_path_report_has_legacy_prompt_version(
        self, db_session: Session, monkeypatch
    ):
        """Report returned by legacy path must have prompt_version='1.0.0-legacy'."""
        role = make_role(db_session)
        iv = _make_interview_with_transcript(db_session, role, rubric_version_used_id=None)

        def _fake_create(**kwargs):
            text_block = MagicMock()
            text_block.type = "text"
            text_block.text = json.dumps({
                "overall_score": 5.5,
                "summary": "Average candidate.",
                "strengths": [],
                "gaps": ["Needs more depth."],
                "skill_assessments": [],
                "stage_notes": [],
                "communication": "OK.",
                "engagement": "Adequate.",
                "hiring_recommendation": "no",
                "candidate_letter": {
                    "subject": "Interview feedback",
                    "body": "Thank you for taking the time to interview with us.",
                },
            })
            mock_resp = MagicMock()
            mock_resp.content = [text_block]
            mock_resp.stop_reason = "end_turn"
            return mock_resp

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = _fake_create
        monkeypatch.setattr("anthropic.Anthropic", MagicMock(return_value=mock_client))
        import app.services.report_service as rs
        rs._client = None
        monkeypatch.setattr("app.core.config.settings.ANTHROPIC_API_KEY", "test-key")

        report = _generate(role, iv, rubric_dict=None)

        assert report is not None
        assert report.get("prompt_version") == "1.0.0-legacy", (
            f"Expected prompt_version='1.0.0-legacy' for legacy path, got {report.get('prompt_version')}"
        )

    def test_no_api_key_returns_none(self, db_session: Session, monkeypatch):
        """When ANTHROPIC_API_KEY is empty, _generate() must return None gracefully."""
        role = make_role(db_session)
        iv = _make_interview_with_transcript(db_session, role)

        monkeypatch.setattr("app.core.config.settings.ANTHROPIC_API_KEY", "")
        import app.services.report_service as rs
        rs._client = None

        result = _generate(role, iv, rubric_dict=None)
        assert result is None, (
            f"Expected None when ANTHROPIC_API_KEY is empty, got {result}"
        )
