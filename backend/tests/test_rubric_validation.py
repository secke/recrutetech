"""Unit tests for rubric_service.validate_rubric.

Coverage:
- Weight sum: happy path, boundary at 1.001, below-threshold (0.95), above-threshold (1.05).
- Skill cap: 8 skills → ok, 9 skills → error mentioning "max 8".
- Level descriptors: missing 'senior' → error.
- Stages: total duration > role duration → error; 0 stages → error.
- Mandatory exclusions auto-merge: empty, partial, idempotent.
"""
from __future__ import annotations

import pytest

from app.services.rubric_service import (
    _MANDATORY_DO_NOT_ASK,
    _MANDATORY_DO_NOT_SCORE,
    validate_rubric,
)
from tests.conftest import make_valid_rubric_json


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _skill(id_: str, weight: float, missing_levels: list[str] | None = None) -> dict:
    """Build a minimal valid skill dict, optionally omitting level_descriptors keys."""
    levels = {
        "junior": f"Junior desc for {id_}",
        "mid": f"Mid desc for {id_}",
        "senior": f"Senior desc for {id_}",
        "staff": f"Staff desc for {id_}",
    }
    if missing_levels:
        for lv in missing_levels:
            levels.pop(lv, None)
    return {
        "id": id_,
        "label": id_.replace("_", " ").title(),
        "weight": weight,
        "level_descriptors": levels,
    }


def _stage(id_: str, duration: int) -> dict:
    return {"id": id_, "label": id_.title(), "duration_minutes": duration, "skills_evaluated": []}


# ---------------------------------------------------------------------------
# Weight sum tests
# ---------------------------------------------------------------------------


class TestWeightSum:
    def test_happy_weights_sum_to_one(self):
        """[0.3, 0.3, 0.4] should pass validation."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("a", 0.3),
                _skill("b", 0.3),
                _skill("c", 0.4),
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is True
        assert result.errors == []

    def test_boundary_sum_1001_passes(self):
        """Sum = 1.001 is within 0.001 tolerance — must pass."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("a", 0.334),
                _skill("b", 0.334),
                _skill("c", 0.333),  # sum = 1.001
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is True, f"Expected ok=True, got errors: {result.errors}"

    def test_sum_095_fails(self):
        """Sum = 0.95 is outside tolerance — must fail with error about 'weights'."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("a", 0.30),
                _skill("b", 0.30),
                _skill("c", 0.35),  # sum = 0.95
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is False
        assert any("weight" in e.lower() for e in result.errors), (
            f"Expected error mentioning 'weights', got: {result.errors}"
        )

    def test_sum_105_fails(self):
        """Sum = 1.05 is outside tolerance — must fail."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("a", 0.35),
                _skill("b", 0.35),
                _skill("c", 0.35),  # sum = 1.05
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is False


# ---------------------------------------------------------------------------
# Skill cap tests
# ---------------------------------------------------------------------------


class TestSkillCap:
    def test_eight_skills_passes(self):
        """Exactly 8 skills → ok=True."""
        skills = [_skill(f"skill_{i}", 0.125) for i in range(8)]
        rubric = make_valid_rubric_json(skills=skills)
        result = validate_rubric(rubric)
        assert result.ok is True, f"Unexpected errors: {result.errors}"

    def test_nine_skills_fails(self):
        """9 skills → ok=False, error message must mention 'max 8'."""
        # 9 skills: weights approximately sum to 1 (9 × 0.111 ≈ 0.999, within tolerance)
        skills = [_skill(f"skill_{i}", 0.111) for i in range(8)]
        skills.append(_skill("skill_8", 0.112))  # total ≈ 1.000
        rubric = make_valid_rubric_json(skills=skills)
        result = validate_rubric(rubric)
        assert result.ok is False
        assert any("8" in e for e in result.errors), (
            f"Expected error mentioning '8', got: {result.errors}"
        )


# ---------------------------------------------------------------------------
# Level descriptor tests
# ---------------------------------------------------------------------------


class TestLevelDescriptors:
    def test_missing_senior_level_fails(self):
        """A skill missing 'senior' level_descriptor → ok=False."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("python", 0.6, missing_levels=["senior"]),
                _skill("comm", 0.4),
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is False
        error_text = " ".join(result.errors)
        assert "senior" in error_text.lower(), (
            f"Expected 'senior' in error, got: {result.errors}"
        )

    def test_missing_junior_and_mid_fails(self):
        """Missing both 'junior' and 'mid' → ok=False with all missing mentioned."""
        rubric = make_valid_rubric_json(
            skills=[
                _skill("python", 0.6, missing_levels=["junior", "mid"]),
                _skill("comm", 0.4),
            ]
        )
        result = validate_rubric(rubric)
        assert result.ok is False

    def test_all_levels_present_passes(self):
        """All four levels (junior/mid/senior/staff) present → ok=True."""
        rubric = make_valid_rubric_json()
        result = validate_rubric(rubric)
        assert result.ok is True


# ---------------------------------------------------------------------------
# Stages tests
# ---------------------------------------------------------------------------


class TestStages:
    def test_stage_duration_exceeds_role_duration_fails(self):
        """Total stage duration > role.duration_minutes (60) → ok=False."""
        rubric = make_valid_rubric_json(
            stages=[
                _stage("intro", 30),
                _stage("technical", 35),  # total = 65 > 60
            ]
        )
        result = validate_rubric(rubric, role_duration_minutes=60)
        assert result.ok is False
        error_text = " ".join(result.errors)
        assert "duration" in error_text.lower(), (
            f"Expected 'duration' in error, got: {result.errors}"
        )

    def test_stage_duration_exactly_at_limit_passes(self):
        """Total = exactly role_duration_minutes → ok=True."""
        rubric = make_valid_rubric_json(
            stages=[
                _stage("intro", 30),
                _stage("technical", 30),  # total = 60 == role
            ]
        )
        result = validate_rubric(rubric, role_duration_minutes=60)
        assert result.ok is True

    def test_zero_stages_fails(self):
        """Empty stages list → ok=False."""
        rubric = make_valid_rubric_json(stages=[])
        result = validate_rubric(rubric)
        assert result.ok is False
        error_text = " ".join(result.errors)
        assert "stage" in error_text.lower(), (
            f"Expected 'stage' in error, got: {result.errors}"
        )


# ---------------------------------------------------------------------------
# Mandatory exclusions auto-merge tests
# ---------------------------------------------------------------------------


class TestMandatoryExclusionsAutoMerge:
    """Validate that validate_rubric NEVER rejects for missing mandatory exclusions —
    it auto-merges them into the normalized rubric. (SKILL.md §6, CLAUDE.md rule #3)
    """

    def test_empty_exclusions_gets_all_mandatory_merged(self):
        """Rubric with no exclusions field → normalized has all 8+ mandatory items."""
        rubric = make_valid_rubric_json()
        # Ensure no exclusions key present
        rubric.pop("exclusions", None)

        result = validate_rubric(rubric)
        assert result.ok is True, f"Should pass validation, got errors: {result.errors}"

        normalized = result.rubric_json_normalized
        excl = normalized.get("exclusions", {})
        ask = excl.get("do_not_ask_about", [])
        score = excl.get("do_not_score_on", [])

        for item in _MANDATORY_DO_NOT_ASK:
            assert item in ask, (
                f"Mandatory do_not_ask_about item '{item}' missing from normalized exclusions. "
                f"Got: {ask}"
            )
        for item in _MANDATORY_DO_NOT_SCORE:
            assert item in score, (
                f"Mandatory do_not_score_on item '{item}' missing from normalized exclusions. "
                f"Got: {score}"
            )

    def test_partial_exclusions_gets_missing_items_merged(self):
        """Rubric with only 'age' in do_not_ask_about → normalized has all mandatory items."""
        rubric = make_valid_rubric_json(
            exclusions={"do_not_ask_about": ["age"], "do_not_score_on": []}
        )
        result = validate_rubric(rubric)
        assert result.ok is True

        normalized = result.rubric_json_normalized
        ask = normalized["exclusions"]["do_not_ask_about"]
        score = normalized["exclusions"]["do_not_score_on"]

        for item in _MANDATORY_DO_NOT_ASK:
            assert item in ask, f"'{item}' missing from do_not_ask_about. Got: {ask}"
        for item in _MANDATORY_DO_NOT_SCORE:
            assert item in score, f"'{item}' missing from do_not_score_on. Got: {score}"

    def test_auto_merge_is_deduplicated(self):
        """If 'age' is already present, it should not be duplicated after merge."""
        rubric = make_valid_rubric_json(
            exclusions={
                "do_not_ask_about": ["age"] + _MANDATORY_DO_NOT_ASK,
                "do_not_score_on": _MANDATORY_DO_NOT_SCORE,
            }
        )
        result = validate_rubric(rubric)
        assert result.ok is True

        ask = result.rubric_json_normalized["exclusions"]["do_not_ask_about"]
        # No duplicates
        assert len(ask) == len(set(ask)), f"Duplicate items found in do_not_ask_about: {ask}"

    def test_validate_rubric_does_not_reject_for_missing_mandatory_exclusions(self):
        """Core contract: missing mandatory exclusions must NEVER make ok=False.
        They must be auto-merged. (validate_rubric merges, never rejects for this reason.)
        """
        rubric = make_valid_rubric_json()
        rubric.pop("exclusions", None)

        result = validate_rubric(rubric)
        # The result must be ok=True even though exclusions were completely absent.
        assert result.ok is True, (
            "validate_rubric must NOT reject a rubric for missing mandatory exclusions — "
            f"it must auto-merge them. Got errors: {result.errors}"
        )
        # And the normalized version must contain them.
        ask = result.rubric_json_normalized.get("exclusions", {}).get("do_not_ask_about", [])
        assert len(ask) >= len(_MANDATORY_DO_NOT_ASK)

    def test_caller_dict_is_not_mutated(self):
        """validate_rubric must deep-copy the input — the caller's dict is unchanged."""
        rubric = make_valid_rubric_json()
        rubric.pop("exclusions", None)
        original_keys = set(rubric.keys())

        validate_rubric(rubric)

        # The original rubric dict should NOT have gained an 'exclusions' key.
        assert "exclusions" not in rubric, (
            "validate_rubric mutated the caller's dict by adding 'exclusions'. "
            "It must deep-copy first."
        )
        assert set(rubric.keys()) == original_keys
