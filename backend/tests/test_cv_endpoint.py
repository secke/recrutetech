"""API-layer tests for CV upload endpoints — cv-adaptive-personalization skill.

All Anthropic calls are mocked via the autouse `mock_anthropic` fixture in conftest.py.
`parse_cv` is additionally patched per-test to return deterministic CVParsedSchema values.
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime
from io import BytesIO
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlmodel import Session, select

from tests.conftest import make_role


# ---------------------------------------------------------------------------
# Shared fixture helpers
# ---------------------------------------------------------------------------

_FIXED_PARSED: dict[str, Any] = {
    "candidate_name": "Test Candidate",
    "years_of_experience": 4,
    "seniority_inferred": "mid",
    "primary_stack": ["Python", "Django"],
    "secondary_stack": ["Redis"],
    "domains": ["ecommerce"],
    "notable_projects": [
        {
            "title": "E-commerce platform at ShopCo",
            "tech": ["Python", "Django"],
            "scale_signals": ["50k orders/day"],
            "role": "Backend Engineer",
            "duration_months": 24,
        }
    ],
    "potential_red_flags": [],
    "suggested_deep_dive_topics": ["Django ORM performance", "caching strategy"],
    "language_signals": "english_only",
    "prompt_version": "1.0.0",
    "redactions_applied": ["city"],
}


def _make_cv_parsed_schema(**overrides):
    from app.services.cv_parsing_service import CVParsedSchema, NotableProject

    data = dict(_FIXED_PARSED)
    data.update(overrides)
    # Re-hydrate notable_projects as NotableProject instances
    if "notable_projects" in data and data["notable_projects"]:
        data["notable_projects"] = [
            NotableProject(**p) if isinstance(p, dict) else p
            for p in data["notable_projects"]
        ]
    return CVParsedSchema(**data)


def _make_interview(session: Session, role_id: int, status: str = "pending") -> Any:
    from app.models import Interview

    iv = Interview(
        public_token=secrets.token_urlsafe(12),
        role_id=role_id,
        status=status,
        candidate_name="Test Candidate",
        candidate_email="test@example.com",
    )
    session.add(iv)
    session.commit()
    session.refresh(iv)
    return iv


# ---------------------------------------------------------------------------
# POST /api/interviews/{token}/cv/text
# ---------------------------------------------------------------------------


class TestUploadCVTextEndpoint:
    def test_happy_path_returns_200_with_ok_status(self, test_client, db_session, mocker):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        parsed = _make_cv_parsed_schema()
        mocker.patch(
            "app.api.cv.parse_cv",
            new=AsyncMock(return_value=parsed),
        )

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={
                "text": "Alice Dupont, senior engineer, 5 years experience in Python.",
                "consent_processing": True,
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["ok"] is True
        assert body["parsing_status"] == "ok"
        assert "redactions_applied" in body
        assert "city" in body["redactions_applied"]
        assert body["preview"] is not None

    def test_happy_path_persists_cv_text_and_consent(self, test_client, db_session, mocker):
        from app.models import Interview

        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        parsed = _make_cv_parsed_schema()
        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=parsed))

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={
                "text": "Candidate CV text here. Python, FastAPI, 3 years.",
                "consent_processing": True,
            },
        )
        assert resp.status_code == 200

        db_session.expire_all()
        updated = db_session.exec(
            select(Interview).where(Interview.id == iv.id)
        ).first()

        assert updated.cv_text is not None
        assert "Candidate CV text" in updated.cv_text
        assert updated.cv_parsed_json is not None
        assert updated.personalized_prompt is not None
        assert updated.cv_consent_processing is True
        assert updated.cv_received_at is not None

    def test_missing_consent_returns_422_with_rgpd_message(self, test_client, db_session):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Some CV text.", "consent_processing": False},
        )
        assert resp.status_code == 422
        body = resp.json()
        detail_str = json.dumps(body)
        assert "Article 9 RGPD" in detail_str or "consent" in detail_str.lower()

    def test_missing_consent_field_defaults_false_returns_422(
        self, test_client, db_session
    ):
        """CVTextRequest.consent_processing defaults to False, so omitting it → 422."""
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Some CV text."},
        )
        # Default is False → consent check fails → 422
        assert resp.status_code == 422

    def test_missing_consent_does_not_write_cv_text(self, test_client, db_session):
        """No data must be persisted if consent is not given."""
        from app.models import Interview

        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Some CV text.", "consent_processing": False},
        )

        db_session.expire_all()
        updated = db_session.exec(
            select(Interview).where(Interview.id == iv.id)
        ).first()
        assert updated.cv_text is None
        assert updated.cv_consent_processing is False

    def test_nonexistent_token_returns_404(self, test_client, db_session):
        resp = test_client.post(
            "/api/interviews/NONEXISTENT_TOKEN_XYZ/cv/text",
            json={"text": "Some text.", "consent_processing": True},
        )
        assert resp.status_code == 404

    def test_completed_interview_returns_409(self, test_client, db_session, mocker):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id, status="completed")

        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=_make_cv_parsed_schema()))

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Some text.", "consent_processing": True},
        )
        assert resp.status_code == 409

    def test_re_upload_to_same_token_returns_409(self, test_client, db_session, mocker):
        """Security HIGH-2 stop-gap: a second CV upload to the same interview is
        rejected with 409 to limit financial-DoS via Anthropic budget burn."""
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=_make_cv_parsed_schema()))

        first = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "First CV upload.", "consent_processing": True},
        )
        assert first.status_code == 200

        second = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Second upload should be rejected.", "consent_processing": True},
        )
        assert second.status_code == 409
        assert "already uploaded" in second.json()["detail"].lower()

    def test_parse_cv_exception_returns_200_with_failed_status(
        self, test_client, db_session, mocker
    ):
        """Graceful degradation: even if Claude fails, endpoint returns 200."""
        from app.models import Interview

        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        mocker.patch(
            "app.api.cv.parse_cv",
            new=AsyncMock(side_effect=Exception("simulated Claude failure")),
        )

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Some CV text that will fail parsing.", "consent_processing": True},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["parsing_status"] == "failed"
        assert body["error_summary"] is not None

        # cv_text MUST still be saved even if parsing failed
        db_session.expire_all()
        updated = db_session.exec(
            select(Interview).where(Interview.id == iv.id)
        ).first()
        assert updated.cv_text is not None
        assert updated.cv_consent_processing is True


# ---------------------------------------------------------------------------
# POST /api/interviews/{token}/cv  (multipart file upload)
# ---------------------------------------------------------------------------


class TestUploadCVFileEndpoint:
    def test_txt_file_upload_returns_200(self, test_client, db_session, mocker):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        parsed = _make_cv_parsed_schema()
        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=parsed))

        cv_bytes = b"Jane Smith, Frontend Engineer, 3 years React experience."
        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv",
            data={"consent_processing": "true"},
            files={"file": ("cv.txt", BytesIO(cv_bytes), "text/plain")},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_unsupported_extension_returns_422(self, test_client, db_session, mocker):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=_make_cv_parsed_schema()))

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv",
            data={"consent_processing": "true"},
            files={"file": ("payload.exe", BytesIO(b"\x4d\x5a\x90"), "application/octet-stream")},
        )
        assert resp.status_code == 422

    def test_multipart_without_consent_returns_422(self, test_client, db_session):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/cv",
            data={"consent_processing": "false"},
            files={"file": ("cv.txt", BytesIO(b"Some text"), "text/plain")},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/interviews/{token}/cv-parsed
# ---------------------------------------------------------------------------


class TestGetCVParsed:
    def test_returns_available_true_after_successful_upload(
        self, test_client, db_session, mocker
    ):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        parsed = _make_cv_parsed_schema()
        mocker.patch("app.api.cv.parse_cv", new=AsyncMock(return_value=parsed))

        # Upload first
        test_client.post(
            f"/api/interviews/{iv.public_token}/cv/text",
            json={"text": "Alice Dupont, Python engineer, 5 years.", "consent_processing": True},
        )

        resp = test_client.get(f"/api/interviews/{iv.public_token}/cv-parsed")
        assert resp.status_code == 200
        body = resp.json()
        assert body["available"] is True
        assert body["parsed"] is not None
        assert "candidate_name" in body["parsed"]

    def test_returns_available_false_when_no_cv_uploaded(self, test_client, db_session):
        role = make_role(db_session)
        iv = _make_interview(db_session, role.id)

        resp = test_client.get(f"/api/interviews/{iv.public_token}/cv-parsed")
        assert resp.status_code == 200
        body = resp.json()
        assert body["available"] is False

    def test_nonexistent_token_returns_404(self, test_client):
        resp = test_client.get("/api/interviews/NONEXISTENT_TOKEN_XYZ/cv-parsed")
        assert resp.status_code == 404
