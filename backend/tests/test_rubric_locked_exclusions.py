"""Tests that mandatory exclusions are always persisted via the API,
and that a rubric with invalid weight sum returns 422.

Coverage:
- POST without exclusions → 201, DB row contains all mandatory exclusions.
- POST with exclusions stripped → same result (server auto-merges).
- POST with weight sum 0.5 → 422.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Role
from app.services.rubric_service import _MANDATORY_DO_NOT_ASK, _MANDATORY_DO_NOT_SCORE
from tests.conftest import make_role, make_valid_rubric_json


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def role(db_session: Session) -> Role:
    return make_role(db_session, duration_minutes=60)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestLockedExclusions:
    def test_post_without_exclusions_returns_201_and_merges_exclusions(
        self, test_client: TestClient, db_session: Session, role: Role
    ):
        """POST a rubric body with no exclusions field → 201, persisted row has all mandatory items."""
        rubric_dict = make_valid_rubric_json()
        rubric_dict.pop("exclusions", None)  # strip exclusions entirely

        resp = test_client.post(
            f"/api/roles/{role.id}/rubrics",
            json={"rubric_json": rubric_dict},
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

        body = resp.json()
        rubric_id = body["id"]

        # Fetch the raw DB row and parse stored rubric_json.
        from app.models import Rubric
        db_rubric = db_session.get(Rubric, rubric_id)
        assert db_rubric is not None
        stored = json.loads(db_rubric.rubric_json)

        ask = stored.get("exclusions", {}).get("do_not_ask_about", [])
        score = stored.get("exclusions", {}).get("do_not_score_on", [])

        for item in _MANDATORY_DO_NOT_ASK:
            assert item in ask, (
                f"Mandatory do_not_ask_about item '{item}' not found in stored rubric. "
                f"Got: {ask}"
            )
        for item in _MANDATORY_DO_NOT_SCORE:
            assert item in score, (
                f"Mandatory do_not_score_on item '{item}' not found in stored rubric. "
                f"Got: {score}"
            )

    def test_post_with_stripped_mandatory_items_server_merges_them(
        self, test_client: TestClient, db_session: Session, role: Role
    ):
        """POST explicitly sending empty exclusion lists → server merges all mandatory items."""
        rubric_dict = make_valid_rubric_json(
            exclusions={"do_not_ask_about": [], "do_not_score_on": []}
        )

        resp = test_client.post(
            f"/api/roles/{role.id}/rubrics",
            json={"rubric_json": rubric_dict},
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

        rubric_id = resp.json()["id"]

        from app.models import Rubric
        db_rubric = db_session.get(Rubric, rubric_id)
        stored = json.loads(db_rubric.rubric_json)

        ask = stored["exclusions"]["do_not_ask_about"]
        score_items = stored["exclusions"]["do_not_score_on"]

        for item in _MANDATORY_DO_NOT_ASK:
            assert item in ask, f"'{item}' missing from stored do_not_ask_about: {ask}"
        for item in _MANDATORY_DO_NOT_SCORE:
            assert item in score_items, f"'{item}' missing from stored do_not_score_on: {score_items}"

    def test_post_invalid_weight_sum_returns_422(
        self, test_client: TestClient, role: Role
    ):
        """POST a rubric where weights sum to 0.5 → 422 Unprocessable Entity."""
        rubric_dict = make_valid_rubric_json()
        # Deliberately set all weights to produce sum = 0.5
        for skill in rubric_dict["skills"]:
            skill["weight"] = 0.5 / len(rubric_dict["skills"])

        resp = test_client.post(
            f"/api/roles/{role.id}/rubrics",
            json={"rubric_json": rubric_dict},
        )
        assert resp.status_code == 422, (
            f"Expected 422 for invalid weight sum, got {resp.status_code}: {resp.text}"
        )
