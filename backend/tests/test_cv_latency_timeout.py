"""Latency / timeout tests for cv_parsing_service.parse_cv.

Tests:
1. A 70s simulated delay triggers an error (TimeoutError or similar) from
   the Anthropic client call, and parse_cv propagates a clean exception.
2. The CV upload endpoint returns 200 with parsing_status='failed' even on
   a timeout (graceful degradation path).

Notes:
- We mock asyncio.sleep in the side_effect so the test runs instantly.
  The actual `timeout=60` in parse_cv passes the value to the Anthropic client;
  in the mock we raise asyncio.TimeoutError to simulate a timed-out call.
- No real delays are introduced; the test suite stays under 30s total.
"""
from __future__ import annotations

import asyncio
import io
import secrets
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlmodel import Session


# ---------------------------------------------------------------------------
# Helper factories (inlined to avoid import side-effects)
# ---------------------------------------------------------------------------


def _make_interview(session: Session, role_id: int, status: str = "pending"):
    from app.models import Interview

    iv = Interview(
        public_token=secrets.token_urlsafe(12),
        role_id=role_id,
        status=status,
        candidate_name="Timeout Candidate",
        candidate_email="timeout@example.com",
    )
    session.add(iv)
    session.commit()
    session.refresh(iv)
    return iv


def _make_role_obj(session: Session):
    from tests.conftest import make_role

    return make_role(session)


# ---------------------------------------------------------------------------
# Test 1: parse_cv raises an error on simulated timeout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parse_cv_raises_on_simulated_70s_timeout(mocker):
    """When the Anthropic client times out (asyncio.TimeoutError), parse_cv raises.

    The service does not swallow this — it propagates the exception so that
    the *endpoint* layer can catch it and return 200 with parsing_status='failed'.
    """
    from app.services import cv_parsing_service
    from app.services.cv_parsing_service import parse_cv

    async def _timeout_side_effect(*args, **kwargs):
        raise asyncio.TimeoutError("simulated 70s timeout")

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(side_effect=_timeout_side_effect)
    mocker.patch.object(cv_parsing_service, "_async_client", mock_client)

    with pytest.raises((asyncio.TimeoutError, TimeoutError, Exception)) as exc_info:
        await parse_cv("Alice Dupont, senior Python engineer, 5 years.")

    # Verify the raised exception is indeed timeout-related (not a schema error)
    exc_type = type(exc_info.value).__name__
    assert exc_type in (
        "TimeoutError", "TimeoutException", "ReadTimeout", "ConnectTimeout",
        "asyncio.TimeoutError",
    ) or "timeout" in str(exc_info.value).lower() or "Timeout" in exc_type, (
        f"Expected a timeout-related exception, got: {exc_type}: {exc_info.value}"
    )


# ---------------------------------------------------------------------------
# Test 2: endpoint returns 200 with parsing_status='failed' on timeout
# ---------------------------------------------------------------------------


def test_endpoint_returns_200_with_failed_status_on_parse_timeout(
    test_client, db_session, mocker
):
    """The CV text endpoint gracefully handles a parse_cv timeout.

    Even when parse_cv raises asyncio.TimeoutError, the endpoint must:
    - Return HTTP 200 (not 500)
    - Include parsing_status='failed' in the response
    - Include a non-null error_summary
    - Still persist cv_text and cv_consent_processing=True
    """
    from sqlmodel import select
    from app.models import Interview

    role = _make_role_obj(db_session)
    iv = _make_interview(db_session, role.id)

    mocker.patch(
        "app.api.cv.parse_cv",
        new=AsyncMock(side_effect=asyncio.TimeoutError("simulated 70s timeout")),
    )

    resp = test_client.post(
        f"/api/interviews/{iv.public_token}/cv/text",
        json={
            "text": "Alice Dupont, senior Python engineer, 5 years experience.",
            "consent_processing": True,
        },
    )

    assert resp.status_code == 200, (
        f"Expected 200 on timeout degradation, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert body["parsing_status"] == "failed", (
        f"Expected parsing_status='failed', got '{body['parsing_status']}'"
    )
    assert body["error_summary"] is not None, (
        "error_summary must not be null when parsing_status='failed'"
    )

    # cv_text must still be persisted
    db_session.expire_all()
    updated = db_session.exec(
        select(Interview).where(Interview.id == iv.id)
    ).first()
    assert updated.cv_text is not None, "cv_text must be saved even when parsing times out"
    assert updated.cv_consent_processing is True, (
        "cv_consent_processing must be True after consent was given"
    )


# ---------------------------------------------------------------------------
# Test 3: httpx.ReadTimeout also triggers graceful degradation
# ---------------------------------------------------------------------------


def test_endpoint_returns_200_on_httpx_read_timeout(test_client, db_session, mocker):
    """httpx.ReadTimeout (from the Anthropic SDK HTTP layer) is also handled gracefully."""
    import httpx
    from sqlmodel import select
    from app.models import Interview

    role = _make_role_obj(db_session)
    iv = _make_interview(db_session, role.id)

    mocker.patch(
        "app.api.cv.parse_cv",
        new=AsyncMock(
            side_effect=httpx.ReadTimeout(
                "Read timeout after 60s", request=MagicMock()
            )
        ),
    )

    resp = test_client.post(
        f"/api/interviews/{iv.public_token}/cv/text",
        json={
            "text": "Some CV text for a candidate.",
            "consent_processing": True,
        },
    )

    assert resp.status_code == 200
    assert resp.json()["parsing_status"] == "failed"

    db_session.expire_all()
    updated = db_session.exec(
        select(Interview).where(Interview.id == iv.id)
    ).first()
    assert updated.cv_text is not None
