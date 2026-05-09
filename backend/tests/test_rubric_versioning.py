"""Tests for rubric versioning, immutability, and activation gate.

Coverage:
- Three successive POSTs → monotonically increasing versions (1, 2, 3).
- PATCH /api/rubrics/{id} → always 405 with documented error body.
- Activate version 2 → v1 and v3 become inactive, v2 becomes active.
- Activate without prior synthetic test → 409.
- After activation: POST a new rubric for same role → creates v4, v2.rubric_json unchanged.
"""
from __future__ import annotations

import json

import pytest
from sqlmodel import Session

from app.models import Rubric, Role
from app.services.rubric_service import activate_rubric, create_rubric
from tests.conftest import make_role, make_valid_rubric_json


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def role(db_session: Session) -> Role:
    return make_role(db_session, duration_minutes=60)


def _make_tested_rubric(rubric: Rubric, session: Session) -> Rubric:
    """Mark a Rubric as tested with differentiation_ok=True so it can be activated."""
    from datetime import datetime, timezone
    rubric.test_results_json = json.dumps({
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "simulations": [
            {"candidate_level": "junior", "overall_score": 2.0, "skill_scores": {}},
            {"candidate_level": "mid", "overall_score": 4.0, "skill_scores": {}},
            {"candidate_level": "senior", "overall_score": 4.5, "skill_scores": {}},
        ],
        "differentiation_ok": True,
        "warnings": [],
    })
    rubric.last_tested_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(rubric)
    session.commit()
    session.refresh(rubric)
    return rubric


# ---------------------------------------------------------------------------
# Version monotonicity
# ---------------------------------------------------------------------------


class TestVersionMonotonicity:
    async def test_three_posts_produce_versions_1_2_3(
        self, db_session: Session, role: Role
    ):
        """POST 3 rubrics for the same role → versions are 1, 2, 3 (monotonic)."""
        r1 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r2 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r3 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )

        assert r1.version == 1, f"Expected version 1, got {r1.version}"
        assert r2.version == 2, f"Expected version 2, got {r2.version}"
        assert r3.version == 3, f"Expected version 3, got {r3.version}"

    async def test_new_rubrics_are_inactive_on_creation(
        self, db_session: Session, role: Role
    ):
        """Newly created rubrics must always be is_active=False."""
        r = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        assert r.is_active is False, "Newly created rubric must be inactive"


# ---------------------------------------------------------------------------
# PATCH → 405
# ---------------------------------------------------------------------------


class TestPatchAlways405:
    def test_patch_returns_405(self, test_client, role: Role):
        """PATCH /api/rubrics/{id} must return 405 regardless of body or existence."""
        resp = test_client.patch("/api/rubrics/9999", json={"rubric_json": {}})
        assert resp.status_code == 405, (
            f"Expected 405 for PATCH, got {resp.status_code}: {resp.text}"
        )

    def test_patch_response_contains_error_key(self, test_client, role: Role):
        """Response body must contain an 'error' key explaining immutability."""
        resp = test_client.patch("/api/rubrics/1", json={})
        assert resp.status_code == 405
        body = resp.json()
        assert "error" in body, f"Expected 'error' key in 405 body, got: {body}"
        # The error message should mention 'immutable' or guide the user to create a new version.
        error_msg = body["error"].lower()
        assert "immutable" in error_msg or "new version" in error_msg or "post" in error_msg, (
            f"Error message should explain immutability, got: {body['error']}"
        )


# ---------------------------------------------------------------------------
# Activation: only one active per role
# ---------------------------------------------------------------------------


class TestActivation:
    async def test_activate_v2_deactivates_v1_and_v3(
        self, db_session: Session, role: Role
    ):
        """Activating version 2 → v1 and v3 become inactive, only v2 is active."""
        r1 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r2 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r3 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )

        # Mark v2 as tested
        _make_tested_rubric(r2, db_session)

        activated = await activate_rubric(db_session, r2.id)
        assert activated.is_active is True

        # Reload v1 and v3 from DB to verify they are inactive
        db_session.refresh(r1)
        db_session.refresh(r3)
        assert r1.is_active is False, f"v1 should be inactive after activating v2, got is_active={r1.is_active}"
        assert r3.is_active is False, f"v3 should be inactive after activating v2, got is_active={r3.is_active}"

    async def test_get_active_rubric_returns_v2_after_activation(
        self, db_session: Session, role: Role
    ):
        """get_active_rubric_for_role should return the activated rubric."""
        from app.services.rubric_service import get_active_rubric_for_role

        r1 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r2 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r3 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )

        _make_tested_rubric(r2, db_session)
        await activate_rubric(db_session, r2.id)

        active = get_active_rubric_for_role(db_session, role.id)
        assert active is not None, "get_active_rubric_for_role returned None"
        assert active.id == r2.id, (
            f"Expected active rubric to be v2 (id={r2.id}), got id={active.id}"
        )

    async def test_activate_without_test_raises_409_equivalent(
        self, db_session: Session, role: Role
    ):
        """Activating a rubric that has never been tested → ValueError (maps to 409 via API)."""
        r = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        # r.test_results_json is None at this point — no test has been run.

        with pytest.raises(ValueError) as exc_info:
            await activate_rubric(db_session, r.id)

        error_msg = str(exc_info.value).lower()
        assert "test" in error_msg or "tested" in error_msg, (
            f"Error should mention 'test' requirement, got: {exc_info.value}"
        )

    def test_activate_api_without_test_returns_409(
        self, test_client, db_session: Session, role: Role
    ):
        """API layer: POST activate on untested rubric → 409 Conflict."""
        # Create a rubric via the API
        rubric_dict = make_valid_rubric_json()
        resp = test_client.post(
            f"/api/roles/{role.id}/rubrics",
            json={"rubric_json": rubric_dict},
        )
        assert resp.status_code == 201
        rubric_id = resp.json()["id"]

        # Try to activate without testing
        activate_resp = test_client.post(f"/api/rubrics/{rubric_id}/activate")
        assert activate_resp.status_code == 409, (
            f"Expected 409 for activation without test, got {activate_resp.status_code}: {activate_resp.text}"
        )
        # Error message must be informative
        detail = activate_resp.json().get("detail", "")
        assert detail, "409 response must include a 'detail' explaining why"

    async def test_activate_with_failed_differentiation_raises(
        self, db_session: Session, role: Role
    ):
        """Activating a rubric where test_results_json has differentiation_ok=False → ValueError."""
        from datetime import datetime, timezone
        r = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        # Mark as tested but with failing differentiation
        r.test_results_json = json.dumps({
            "tested_at": datetime.now(timezone.utc).isoformat(),
            "simulations": [
                {"candidate_level": "junior", "overall_score": 4.0, "skill_scores": {}},
                {"candidate_level": "mid", "overall_score": 4.2, "skill_scores": {}},
                {"candidate_level": "senior", "overall_score": 4.5, "skill_scores": {}},
            ],
            "differentiation_ok": False,
            "warnings": ["Spread 0.5 < 1.5 — insufficient differentiation."],
        })
        r.last_tested_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db_session.add(r)
        db_session.commit()

        with pytest.raises(ValueError) as exc_info:
            await activate_rubric(db_session, r.id)

        error_msg = str(exc_info.value).lower()
        assert "differentiation" in error_msg, (
            f"Error should mention differentiation failure, got: {exc_info.value}"
        )


# ---------------------------------------------------------------------------
# Immutability: new post after activation creates v4, v2 unchanged
# ---------------------------------------------------------------------------


class TestImmutabilityAfterActivation:
    async def test_post_after_activation_creates_v4_not_mutate_v2(
        self, db_session: Session, role: Role
    ):
        """After activating v2: POST a new (modified) rubric → creates v4; v2.rubric_json is unchanged."""
        r1 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r2 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )
        r3 = await create_rubric(
            db_session, role.id, make_valid_rubric_json(), created_by="hr@test.com"
        )

        _make_tested_rubric(r2, db_session)
        await activate_rubric(db_session, r2.id)

        # Capture the current rubric_json of v2 BEFORE the new POST
        snapshot_v2_json = r2.rubric_json

        # Build a slightly modified rubric (change role_title) so we can detect mutation
        modified_rubric = make_valid_rubric_json()
        modified_rubric["role_title"] = "Modified Role Title"

        r4 = await create_rubric(
            db_session, role.id, modified_rubric, created_by="hr@test.com"
        )

        assert r4.version == 4, f"Expected version 4, got {r4.version}"
        assert r4.is_active is False, "Newly created v4 should be inactive"

        # v2 must be unchanged
        db_session.refresh(r2)
        assert r2.rubric_json == snapshot_v2_json, (
            "v2.rubric_json was mutated after creating v4. Rubrics must be immutable."
        )

        # v2 is still active (the new POST doesn't deactivate it)
        assert r2.is_active is True, "v2 should remain active after creating v4"
