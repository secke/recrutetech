"""HR-side endpoints: create, list, and manage structured evaluation rubrics.

Rubric lifecycle:
  POST   /api/roles/{role_id}/rubrics          — create a new version (always inactive)
  GET    /api/roles/{role_id}/rubrics          — list all versions for a role (desc)
  GET    /api/rubrics/{rubric_id}              — fetch a single rubric
  PATCH  /api/rubrics/{rubric_id}              — always 405 (rubrics are immutable)
  POST   /api/rubrics/{rubric_id}/activate     — activate after a passing synthetic test
  POST   /api/rubrics/{rubric_id}/test         — run synthetic-candidate calibration test

Authorization:
  All write endpoints require require_admin_or_hm (stub for now).
  Read endpoints are open (consistent with how GET /api/roles is open).
  TODO(auth-skill): replace require_admin_or_hm with a proper JWT/RBAC dependency
  once the Company/User models are introduced in Wave 2.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.models import Rubric
from app.services import rubric_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["rubrics"])


# ---------------------------------------------------------------------------
# Authorization stub — TODO(auth-skill): replace with real RBAC
# ---------------------------------------------------------------------------


def require_admin_or_hm() -> str:
    """Stub auth dependency: always returns 'admin'.

    TODO(auth-skill): implement proper JWT/RBAC here once Company/User models
    are introduced. This stub lets the endpoints be exercisable immediately while
    keeping the dependency injection interface stable for the future swap.
    """
    return "admin"


# ---------------------------------------------------------------------------
# Pydantic schemas (inline, matching the pattern in interviews.py / roles.py)
# ---------------------------------------------------------------------------


class RubricCreateRequest(BaseModel):
    """Body for POST /api/roles/{role_id}/rubrics."""
    rubric_json: dict
    name: Optional[str] = None


class RubricOut(BaseModel):
    """Wire-format for a single Rubric row."""
    id: int
    role_id: int
    version: int
    is_active: bool
    name: str
    rubric_json: dict          # decoded from the stored JSON text
    created_by: str
    created_at: datetime
    last_tested_at: Optional[datetime] = None
    test_results: Optional[dict] = None  # decoded from test_results_json


def _to_out(r: Rubric) -> RubricOut:
    rubric_dict: dict = {}
    try:
        rubric_dict = json.loads(r.rubric_json)
    except (json.JSONDecodeError, TypeError):
        pass

    test_results: Optional[dict] = None
    if r.test_results_json:
        try:
            test_results = json.loads(r.test_results_json)
        except (json.JSONDecodeError, TypeError):
            pass

    return RubricOut(
        id=r.id,  # type: ignore[arg-type]
        role_id=r.role_id,
        version=r.version,
        is_active=r.is_active,
        name=r.name,
        rubric_json=rubric_dict,
        created_by=r.created_by,
        created_at=r.created_at,
        last_tested_at=r.last_tested_at,
        test_results=test_results,
    )


# ---------------------------------------------------------------------------
# POST /api/roles/{role_id}/rubrics — create a new rubric version
# ---------------------------------------------------------------------------


@router.post(
    "/api/roles/{role_id}/rubrics",
    response_model=RubricOut,
    status_code=201,
)
async def create_rubric(
    role_id: int,
    payload: RubricCreateRequest,
    session: Session = Depends(get_session),
    actor: str = Depends(require_admin_or_hm),
) -> RubricOut:
    """Create a new (always inactive) rubric version for the given role.

    Validates: weight sum = 1.0 ± 0.001, max 8 skills, level_descriptors present,
    at least 1 stage. Mandatory RGPD/anti-bias exclusions are auto-merged into
    rubric_json (never rejected for missing ones).
    """
    try:
        rubric = await rubric_service.create_rubric(
            session=session,
            role_id=role_id,
            rubric_json_dict=payload.rubric_json,
            created_by=actor,
            name=payload.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    logger.info(
        "api.rubric.created",
        extra={"role_id": role_id, "rubric_id": rubric.id, "version": rubric.version},
    )
    return _to_out(rubric)


# ---------------------------------------------------------------------------
# GET /api/roles/{role_id}/rubrics — list all versions
# ---------------------------------------------------------------------------


@router.get(
    "/api/roles/{role_id}/rubrics",
    response_model=List[RubricOut],
)
def list_rubrics(
    role_id: int,
    session: Session = Depends(get_session),
) -> List[RubricOut]:
    """List all rubric versions for a role, sorted descending by version."""
    rows = session.exec(
        select(Rubric)
        .where(Rubric.role_id == role_id)
        .order_by(Rubric.version.desc())  # type: ignore[union-attr]
    ).all()
    return [_to_out(r) for r in rows]


# ---------------------------------------------------------------------------
# GET /api/rubrics/{rubric_id} — fetch one
# ---------------------------------------------------------------------------


@router.get(
    "/api/rubrics/{rubric_id}",
    response_model=RubricOut,
)
def get_rubric(
    rubric_id: int,
    session: Session = Depends(get_session),
) -> RubricOut:
    """Fetch a single rubric by its primary-key id."""
    rubric = session.get(Rubric, rubric_id)
    if not rubric:
        raise HTTPException(404, "Rubric not found")
    return _to_out(rubric)


# ---------------------------------------------------------------------------
# PATCH /api/rubrics/{rubric_id} — always 405 (rubrics are immutable)
# ---------------------------------------------------------------------------


@router.patch("/api/rubrics/{rubric_id}")
def patch_rubric(rubric_id: int) -> JSONResponse:
    """Rubrics are immutable once created.

    To change a rubric, create a new version via:
        POST /api/roles/{role_id}/rubrics
    """
    return JSONResponse(
        status_code=405,
        content={
            "error": (
                "Rubrics are immutable. "
                "Create a new version via POST /api/roles/{role_id}/rubrics."
            )
        },
    )


# ---------------------------------------------------------------------------
# POST /api/rubrics/{rubric_id}/activate — activate after passing test
# ---------------------------------------------------------------------------


@router.post(
    "/api/rubrics/{rubric_id}/activate",
    response_model=RubricOut,
)
async def activate_rubric(
    rubric_id: int,
    session: Session = Depends(get_session),
    actor: str = Depends(require_admin_or_hm),
) -> RubricOut:
    """Activate a rubric version.

    Preconditions (raises 409 if not met):
    - rubric.test_results_json is non-null (rubric has been tested at least once)
    - The test result's differentiation_ok == True

    Deactivates all other versions for the same role atomically.

    Audit log: rubric_id, role_id, actor, event are emitted at INFO level.
    """
    try:
        rubric = await rubric_service.activate_rubric(session, rubric_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # Audit log — SKILL.md §6: log activation with rubric_id + role_id + actor.
    logger.info(
        "rubric.api.activated",
        extra={
            "rubric_id": rubric_id,
            "role_id": rubric.role_id,
            "version": rubric.version,
            "activated_by_hash": hash(actor),  # RGPD: never log raw email above DEBUG
        },
    )
    return _to_out(rubric)


# ---------------------------------------------------------------------------
# POST /api/rubrics/{rubric_id}/test — run synthetic-candidate calibration test
# ---------------------------------------------------------------------------


class TestResponse(BaseModel):
    status: str           # "completed" | "running"
    rubric_id: int
    test_results: Optional[dict] = None


@router.post(
    "/api/rubrics/{rubric_id}/test",
    response_model=TestResponse,
)
async def test_rubric(
    rubric_id: int,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
    actor: str = Depends(require_admin_or_hm),
) -> TestResponse:
    """Run 3 synthetic-candidate simulations (junior / mid / senior) and score them.

    The test is run synchronously (awaited inline) when the Anthropic client is
    configured. This may take 30-120 s depending on model latency — the endpoint
    has a generous timeout in production reverse-proxy configuration.

    If ANTHROPIC_API_KEY is not set (dev bypass), the service uses hard-coded stub
    scores. The response always includes the full test_results dict.

    Returns 409 if rubric does not exist.
    """
    from app.models import Rubric as RubricModel

    rubric = session.get(RubricModel, rubric_id)
    if not rubric:
        raise HTTPException(404, "Rubric not found")

    try:
        test_results = await rubric_service.run_synthetic_test(session, rubric_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "api.rubric.test.failed",
            extra={"rubric_id": rubric_id, "error": str(exc)},
        )
        raise HTTPException(status_code=502, detail=f"Synthetic test failed: {exc}")

    return TestResponse(
        status="completed",
        rubric_id=rubric_id,
        test_results=test_results,
    )
