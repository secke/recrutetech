"""Tests for run_synthetic_test: differentiation acceptance criterion.

The spec requires senior_overall - junior_overall >= 1.5 (on 0-5 or 0-10 scale)
to flip differentiation_ok=True. We mock at the higher-level seam:
  app.services.synthetic_runner.simulate_candidate_transcript
  app.services.synthetic_runner.score_transcript_against_rubric

This is more stable than mocking the raw Anthropic client and avoids
re-implementing the scoring logic in tests.

Coverage:
- Calibrated mock (good spread >= 1.5) → differentiation_ok=True.
- Calibrated mock (poor spread < 1.5) → differentiation_ok=False + warnings mentioning differentiation.
- After run: rubric.last_tested_at is set, test_results_json is valid JSON with correct shape.
"""
from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from sqlmodel import Session

from app.models import Role
from app.services.rubric_service import create_rubric, run_synthetic_test
from tests.conftest import make_role, make_valid_rubric_json


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def role(db_session: Session) -> Role:
    return make_role(db_session, duration_minutes=60)


# ---------------------------------------------------------------------------
# Helper — build per-level return value for score_transcript_against_rubric mock
# ---------------------------------------------------------------------------


def _score_side_effect_factory(
    scores_by_level: dict[str, float],
    skill_ids: list[str],
):
    """Build an AsyncMock side_effect that returns skill_scores + overall based on
    the transcript we pass. Since we control the transcript mock, we use a counter
    to map calls to levels in order: junior (0), mid (1), senior (2)."""
    call_count = [0]

    async def side_effect(rubric_dict: dict, transcript: list):
        level_order = ["junior", "mid", "senior"]
        idx = call_count[0] % len(level_order)
        call_count[0] += 1
        level = level_order[idx]
        overall = scores_by_level[level]
        skill_scores = {sid: overall for sid in skill_ids}
        return skill_scores, overall

    return side_effect


# ---------------------------------------------------------------------------
# Good-spread scenario: junior=2.0, mid=4.0, senior=4.5 → spread=2.5
# ---------------------------------------------------------------------------


class TestGoodDifferentiation:
    async def test_differentiation_ok_true_for_large_spread(
        self, db_session: Session, role: Role, mocker
    ):
        """When senior=4.5 and junior=2.0 (spread=2.5 >= 1.5) → differentiation_ok=True."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )

        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "I know asyncio well.", "time_in_call_secs": 10}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 2.0, "mid": 4.0, "senior": 4.5},
                skill_ids,
            )),
        )

        result = await run_synthetic_test(db_session, rubric.id)

        assert result["differentiation_ok"] is True, (
            f"Expected differentiation_ok=True for spread 2.5, got {result}"
        )

    async def test_scores_by_level_match_mock_values(
        self, db_session: Session, role: Role, mocker
    ):
        """Returned simulation dicts have the expected overall_score per level."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "I can write REST APIs.", "time_in_call_secs": 5}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 2.0, "mid": 4.0, "senior": 4.5},
                skill_ids,
            )),
        )

        result = await run_synthetic_test(db_session, rubric.id)

        sims = {s["candidate_level"]: s for s in result["simulations"]}
        assert sims["junior"]["overall_score"] == pytest.approx(2.0, abs=0.05), (
            f"Expected junior overall_score ≈ 2.0, got {sims['junior']['overall_score']}"
        )
        assert sims["mid"]["overall_score"] == pytest.approx(4.0, abs=0.05), (
            f"Expected mid overall_score ≈ 4.0, got {sims['mid']['overall_score']}"
        )
        assert sims["senior"]["overall_score"] == pytest.approx(4.5, abs=0.05), (
            f"Expected senior overall_score ≈ 4.5, got {sims['senior']['overall_score']}"
        )


# ---------------------------------------------------------------------------
# Poor-spread scenario: junior=4.0, mid=4.2, senior=4.5 → spread=0.5
# ---------------------------------------------------------------------------


class TestPoorDifferentiation:
    async def test_differentiation_ok_false_for_small_spread(
        self, db_session: Session, role: Role, mocker
    ):
        """When senior=4.5 and junior=4.0 (spread=0.5 < 1.5) → differentiation_ok=False."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "I can write code.", "time_in_call_secs": 3}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 4.0, "mid": 4.2, "senior": 4.5},
                skill_ids,
            )),
        )

        result = await run_synthetic_test(db_session, rubric.id)

        assert result["differentiation_ok"] is False, (
            f"Expected differentiation_ok=False for spread 0.5, got {result}"
        )

    async def test_warnings_mention_differentiation_on_poor_spread(
        self, db_session: Session, role: Role, mocker
    ):
        """Warnings list must mention 'differentiation' or 'level_descriptors' when spread < 1.5."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "I code.", "time_in_call_secs": 1}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 4.0, "mid": 4.2, "senior": 4.5},
                skill_ids,
            )),
        )

        result = await run_synthetic_test(db_session, rubric.id)

        warnings_text = " ".join(result.get("warnings", [])).lower()
        assert "differentiation" in warnings_text or "level_descriptors" in warnings_text, (
            f"Expected 'differentiation' or 'level_descriptors' in warnings, got: {result['warnings']}"
        )


# ---------------------------------------------------------------------------
# Persistence checks: last_tested_at and test_results_json shape
# ---------------------------------------------------------------------------


class TestResultPersistence:
    async def test_last_tested_at_is_set_after_run(
        self, db_session: Session, role: Role, mocker
    ):
        """After run_synthetic_test, rubric.last_tested_at must be non-null."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        assert rubric.last_tested_at is None, "Precondition: last_tested_at should be None before test"
        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "asyncio.", "time_in_call_secs": 5}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 2.0, "mid": 4.0, "senior": 4.5},
                skill_ids,
            )),
        )

        await run_synthetic_test(db_session, rubric.id)

        db_session.refresh(rubric)
        assert rubric.last_tested_at is not None, (
            "rubric.last_tested_at must be set after run_synthetic_test"
        )
        assert isinstance(rubric.last_tested_at, datetime), (
            f"last_tested_at must be a datetime, got {type(rubric.last_tested_at)}"
        )

    async def test_test_results_json_shape(
        self, db_session: Session, role: Role, mocker
    ):
        """test_results_json must decode to a dict with the documented shape."""
        rubric = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        skill_ids = ["python_backend", "system_design", "communication"]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "asyncio.", "time_in_call_secs": 5}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_score_side_effect_factory(
                {"junior": 2.0, "mid": 4.0, "senior": 4.5},
                skill_ids,
            )),
        )

        await run_synthetic_test(db_session, rubric.id)

        db_session.refresh(rubric)
        assert rubric.test_results_json is not None

        stored = json.loads(rubric.test_results_json)

        # Top-level keys
        assert "tested_at" in stored, f"Missing 'tested_at' in {list(stored.keys())}"
        assert "simulations" in stored, f"Missing 'simulations' in {list(stored.keys())}"
        assert "differentiation_ok" in stored, f"Missing 'differentiation_ok' in {list(stored.keys())}"
        assert "warnings" in stored, f"Missing 'warnings' in {list(stored.keys())}"

        # tested_at must be a valid ISO-8601 string
        assert isinstance(stored["tested_at"], str)
        # Basic sanity: parseable
        datetime.fromisoformat(stored["tested_at"].replace("Z", "+00:00"))

        # simulations shape
        assert isinstance(stored["simulations"], list)
        assert len(stored["simulations"]) == 3, (
            f"Expected 3 simulations (junior/mid/senior), got {len(stored['simulations'])}"
        )

        level_names = {s["candidate_level"] for s in stored["simulations"]}
        assert level_names == {"junior", "mid", "senior"}, (
            f"Expected levels junior/mid/senior, got {level_names}"
        )

        for sim in stored["simulations"]:
            assert "candidate_level" in sim, f"Simulation row missing 'candidate_level': {sim}"
            assert "overall_score" in sim, f"Simulation row missing 'overall_score': {sim}"
            assert "skill_scores" in sim, f"Simulation row missing 'skill_scores': {sim}"
            assert isinstance(sim["skill_scores"], dict), (
                f"skill_scores must be a dict, got {type(sim['skill_scores'])}: {sim}"
            )

        # warnings must be a list
        assert isinstance(stored["warnings"], list), (
            f"warnings must be a list, got {type(stored['warnings'])}"
        )
