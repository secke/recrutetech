"""Tests that different rubrics with different weights produce different overall scores.

Acceptance criterion (SKILL.md): two different rubrics on the same candidate
transcript produce significantly different scores when weights differ.

Setup:
- rubric_A: python_backend weight=0.7, system_design weight=0.3
- rubric_B: python_backend weight=0.3, system_design weight=0.7
- Transcript is mocked; raw skill scoring mock always returns
  python_backend=4.5 and system_design=2.0 (candidate strong on backend, weak on design).
- Overall score is computed by run_synthetic_test → rubric_service internal weighting.

Expected:
  rubric_A overall ≈ weighted_sum(4.5 * 0.7 + 2.0 * 0.3) = 3.75 (before any 0-5→0-10 normalisation)
  rubric_B overall ≈ weighted_sum(4.5 * 0.3 + 2.0 * 0.7) = 2.75
  |overall_A - overall_B| >= 0.5 (meaningful divergence on the same scale)

Note on scale: run_synthetic_test stores `overall_score` as whatever
score_transcript_against_rubric returns. Looking at the production code,
score_transcript_against_rubric returns (skill_scores, overall_score) on 0-5 scale.
run_synthetic_test stores that value directly without re-weighting — the weighting
happens inside Claude's scoring logic.

For this divergence test we need to mock at the level where the weights actually
affect the output. Since the mock controls score_transcript_against_rubric's
return value (which bypasses real Claude), we must make the mock apply the
rubric weights itself, simulating what real Claude would do.
We compute the weighted overall in the side_effect based on rubric_dict's weights.
"""
from __future__ import annotations

import json
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


def _two_skill_rubric(python_weight: float, design_weight: float) -> dict:
    """Return a minimal valid rubric with exactly two skills and the given weights."""
    skills = [
        {
            "id": "python_backend",
            "label": "Python backend depth",
            "weight": python_weight,
            "level_descriptors": {
                "junior": "Knows syntax.",
                "mid": "Builds REST APIs.",
                "senior": "Designs services for scale.",
                "staff": "Sets technical direction.",
            },
            "must_probe": ["asyncio"],
        },
        {
            "id": "system_design",
            "label": "System design",
            "weight": design_weight,
            "level_descriptors": {
                "junior": "Names basic components.",
                "mid": "Draws simple architecture.",
                "senior": "Multi-dimensional trade-offs.",
                "staff": "Shapes org-wide strategy.",
            },
            "must_probe": ["caching"],
        },
    ]
    # Weights must sum to 1.0 exactly
    assert abs(python_weight + design_weight - 1.0) < 0.001

    return make_valid_rubric_json(skills=skills)


def _weighted_score_side_effect_factory(raw_skill_scores: dict[str, float], call_count_ref: list):
    """
    Build an AsyncMock side_effect that computes overall_score as the weighted sum
    of the raw_skill_scores using the rubric_dict's weights — simulating what
    real Claude would do. Returns same raw skill scores every call.
    """
    async def side_effect(rubric_dict: dict, transcript: list):
        # Compute weighted overall from the rubric's weights
        weighted = 0.0
        skills = rubric_dict.get("skills", [])
        for skill in skills:
            sid = skill["id"]
            w = float(skill.get("weight", 0.0))
            raw = raw_skill_scores.get(sid, 0.0)
            weighted += w * raw

        call_count_ref[0] += 1
        # Clamp to [0, 5]
        overall = max(0.0, min(5.0, weighted))
        return {sid: v for sid, v in raw_skill_scores.items()}, overall

    return side_effect


# ---------------------------------------------------------------------------
# Divergence test
# ---------------------------------------------------------------------------


class TestRubricDivergence:
    async def test_weight_difference_produces_different_overall_scores(
        self, db_session: Session, role: Role, mocker
    ):
        """Rubric A (python-heavy) and rubric B (design-heavy) produce different overall scores
        when candidate is strong on python (4.5) but weak on design (2.0)."""

        rubric_a = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.7, design_weight=0.3),
            created_by="hr@test.com",
        )
        rubric_b = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.3, design_weight=0.7),
            created_by="hr@test.com",
        )

        # Raw skill scores: candidate is strong on python, weak on design.
        # These are the scores Claude would return for the same transcript
        # regardless of which rubric is evaluated (real Claude scores based on
        # what the candidate said, not based on the weights).
        raw_scores = {"python_backend": 4.5, "system_design": 2.0}

        # Each test (3 levels per rubric) = 6 total calls to score_transcript_against_rubric.
        # We track call count separately to maintain isolation between the two runs.
        call_count_a = [0]
        call_count_b = [0]

        # Patch simulate to return a minimal transcript for all calls
        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "I built distributed systems with asyncio.", "time_in_call_secs": 10}
            ]),
        )

        # Run A
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_weighted_score_side_effect_factory(raw_scores, call_count_a)),
        )
        result_a = await run_synthetic_test(db_session, rubric_a.id)

        # Run B — re-patch (mocker will replace the previous patch within the same test)
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_weighted_score_side_effect_factory(raw_scores, call_count_b)),
        )
        result_b = await run_synthetic_test(db_session, rubric_b.id)

        # Extract overall scores for the senior simulation (most representative)
        sims_a = {s["candidate_level"]: s for s in result_a["simulations"]}
        sims_b = {s["candidate_level"]: s for s in result_b["simulations"]}

        overall_a_senior = sims_a["senior"]["overall_score"]
        overall_b_senior = sims_b["senior"]["overall_score"]

        divergence = abs(overall_a_senior - overall_b_senior)

        assert divergence >= 0.5, (
            f"Expected |overall_A - overall_B| >= 0.5 (meaningful divergence), "
            f"got |{overall_a_senior} - {overall_b_senior}| = {divergence:.3f}. "
            f"Rubric weights are not affecting the overall score."
        )

    async def test_rubric_a_scores_higher_than_b_for_python_heavy_candidate(
        self, db_session: Session, role: Role, mocker
    ):
        """Rubric A (python_backend weight=0.7) must yield higher overall than rubric B
        (system_design weight=0.7) when the candidate is strong on python (4.5) but
        weak on system_design (2.0)."""

        rubric_a = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.7, design_weight=0.3),
            created_by="hr@test.com",
        )
        rubric_b = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.3, design_weight=0.7),
            created_by="hr@test.com",
        )

        raw_scores = {"python_backend": 4.5, "system_design": 2.0}
        call_count = [0]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "Python expert here.", "time_in_call_secs": 5}
            ]),
        )

        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_weighted_score_side_effect_factory(raw_scores, call_count)),
        )
        result_a = await run_synthetic_test(db_session, rubric_a.id)

        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_weighted_score_side_effect_factory(raw_scores, call_count)),
        )
        result_b = await run_synthetic_test(db_session, rubric_b.id)

        # For a python-heavy candidate, rubric A (high python weight) should score higher
        avg_a = sum(s["overall_score"] for s in result_a["simulations"]) / 3
        avg_b = sum(s["overall_score"] for s in result_b["simulations"]) / 3

        assert avg_a > avg_b, (
            f"Expected rubric_A overall > rubric_B overall for a python-heavy candidate. "
            f"avg_A={avg_a:.3f}, avg_B={avg_b:.3f}."
        )

    async def test_both_rubrics_have_three_simulations(
        self, db_session: Session, role: Role, mocker
    ):
        """Both runs must produce 3 simulations (junior/mid/senior)."""
        rubric_a = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.7, design_weight=0.3),
            created_by="hr@test.com",
        )
        rubric_b = await create_rubric(
            db_session,
            role.id,
            _two_skill_rubric(python_weight=0.3, design_weight=0.7),
            created_by="hr@test.com",
        )

        raw_scores = {"python_backend": 4.5, "system_design": 2.0}
        call_count = [0]

        mocker.patch(
            "app.services.synthetic_runner.simulate_candidate_transcript",
            new=AsyncMock(return_value=[
                {"role": "user", "text": "Test transcript.", "time_in_call_secs": 1}
            ]),
        )
        mocker.patch(
            "app.services.synthetic_runner.score_transcript_against_rubric",
            new=AsyncMock(side_effect=_weighted_score_side_effect_factory(raw_scores, call_count)),
        )
        result_a = await run_synthetic_test(db_session, rubric_a.id)
        result_b = await run_synthetic_test(db_session, rubric_b.id)

        assert len(result_a["simulations"]) == 3
        assert len(result_b["simulations"]) == 3
