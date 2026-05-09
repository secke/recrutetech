"""Service layer for the structured-rubric-builder skill.

Invariants enforced here (see models.py module docstring for full schema contract):
- One active rubric per role: activate_rubric() deactivates all siblings in one transaction.
- Rubric rows are append-only / immutable: create_rubric() only inserts; PATCH → new version.
- Mandatory RGPD/anti-bias exclusions are auto-merged into rubric_json (never rejected for missing ones).
- A rubric must be synthetic-tested (differentiation_ok=True) before activation.

RGPD: rubric_json may contain HR-authored text (job criteria). Retention follows the parent Role's
lifecycle. test_results_json contains synthetic data only (no real candidate PII). See §9 SKILL.md.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Session, select

from app.models import Interview, Role, Rubric

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hard-coded mandatory exclusions (CLAUDE.md hard rule #3 + SKILL.md §6)
# These must always appear in rubric_json["exclusions"] regardless of HR input.
# ---------------------------------------------------------------------------

_MANDATORY_DO_NOT_ASK: list[str] = [
    "age",
    "marital_status",
    "religion",
    "country_of_origin",
    "race",
    "ethnicity",
]

_MANDATORY_DO_NOT_SCORE: list[str] = [
    "accent",
    "facial_expressions",
    "physical_appearance",
    "gender",
    "disability",
    "school_name",
]

# Required level descriptors that every skill must cover (junior/mid/senior minimum).
_REQUIRED_LEVELS = {"junior", "mid", "senior"}


# ---------------------------------------------------------------------------
# Validation result type
# ---------------------------------------------------------------------------


class ValidationResult:
    """Returned by validate_rubric. Always carries the normalized JSON."""

    def __init__(
        self,
        *,
        ok: bool,
        errors: list[str],
        warnings: list[str],
        rubric_json_normalized: dict,
    ) -> None:
        self.ok = ok
        self.errors = errors
        self.warnings = warnings
        self.rubric_json_normalized = rubric_json_normalized

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "warnings": self.warnings,
            "rubric_json_normalized": self.rubric_json_normalized,
        }


# ---------------------------------------------------------------------------
# validate_rubric — pure function, no DB I/O
# ---------------------------------------------------------------------------


def validate_rubric(rubric_json: dict, role_duration_minutes: int = 0) -> ValidationResult:
    """Validate and normalize a rubric_json dict.

    Rules (SKILL.md §6 + task spec):
    1. skills[].weight must sum to 1.0 ± 0.001.
    2. Maximum 8 skills.
    3. Every skill must have level_descriptors for at least junior, mid, senior.
    4. Mandatory exclusions are auto-merged (never reject for missing ones).
    5. At least 1 stage.
    6. Sum of stage durations ≤ role.duration_minutes (if role_duration_minutes > 0).

    Returns a ValidationResult with `ok=True` if all hard rules pass, plus
    the normalized rubric (with merged exclusions).
    """
    errors: list[str] = []
    warnings: list[str] = []

    # Work on a deep copy so we never mutate the caller's dict.
    try:
        normalized: dict = json.loads(json.dumps(rubric_json))
    except (TypeError, ValueError) as e:
        return ValidationResult(
            ok=False,
            errors=[f"rubric_json is not JSON-serializable: {e}"],
            warnings=[],
            rubric_json_normalized=rubric_json,
        )

    # ---- Skills -------------------------------------------------------
    if not isinstance(normalized.get("skills"), list):
        normalized["skills"] = []
    if not isinstance(normalized.get("stages"), list):
        normalized["stages"] = []
    skills: list[dict] = normalized["skills"]
    if not skills:
        errors.append("rubric_json.skills must contain at least one skill.")

    if len(skills) > 8:
        errors.append(
            f"Maximum 8 skills allowed (received {len(skills)}). "
            "Excess skills dilute evaluation quality."
        )

    weight_sum = sum(float(s.get("weight", 0)) for s in skills)
    if abs(round(weight_sum, 4) - 1.0) > 0.001:
        errors.append(
            f"Sum of skills[].weight must equal 1.0 (got {weight_sum:.4f}). "
            "Adjust weights so they sum exactly to 1.0."
        )

    skill_ids: list[str] = []
    for i, skill in enumerate(skills):
        sid = skill.get("id", f"<skill #{i}>")
        skill_ids.append(sid)
        descriptors: dict = skill.get("level_descriptors", {})
        missing_levels = _REQUIRED_LEVELS - set(descriptors.keys())
        if missing_levels:
            errors.append(
                f"Skill '{sid}' is missing level_descriptors for: "
                + ", ".join(sorted(missing_levels))
                + ". At least junior/mid/senior must be defined."
            )

    # ---- Stages -------------------------------------------------------
    stages: list[dict] = normalized["stages"]
    if not stages:
        errors.append("rubric_json.stages must contain at least one stage.")

    total_duration = sum(int(st.get("duration_minutes", 0)) for st in stages)
    if role_duration_minutes > 0 and total_duration > role_duration_minutes:
        errors.append(
            f"Total stage duration ({total_duration} min) exceeds role duration "
            f"({role_duration_minutes} min). Reduce stage durations or role duration."
        )
    elif total_duration == 0 and stages:
        warnings.append("All stages have duration_minutes=0. Consider setting realistic durations.")

    # Warn about stages referencing skills that don't exist in the rubric.
    for st in stages:
        for ref_skill in st.get("skills_evaluated", []):
            if ref_skill not in skill_ids:
                warnings.append(
                    f"Stage '{st.get('id', '?')}' references skill '{ref_skill}' "
                    "which is not defined in rubric_json.skills."
                )

    # ---- Mandatory exclusions (auto-merge) ----------------------------
    if not isinstance(normalized.get("exclusions"), dict):
        normalized["exclusions"] = {}
    exclusions: dict = normalized["exclusions"]
    if not isinstance(exclusions.get("do_not_ask_about"), list):
        exclusions["do_not_ask_about"] = []
    if not isinstance(exclusions.get("do_not_score_on"), list):
        exclusions["do_not_score_on"] = []
    do_not_ask: list[str] = exclusions["do_not_ask_about"]
    do_not_score: list[str] = exclusions["do_not_score_on"]

    merged_ask = sorted(set(do_not_ask) | set(_MANDATORY_DO_NOT_ASK))
    merged_score = sorted(set(do_not_score) | set(_MANDATORY_DO_NOT_SCORE))

    new_ask = [x for x in merged_ask if x not in do_not_ask]
    new_score = [x for x in merged_score if x not in do_not_score]

    if new_ask or new_score:
        warnings.append(
            "Mandatory exclusions were auto-merged into rubric_json.exclusions: "
            f"do_not_ask_about += {new_ask}, do_not_score_on += {new_score}"
        )

    exclusions["do_not_ask_about"] = merged_ask
    exclusions["do_not_score_on"] = merged_score
    normalized["exclusions"] = exclusions

    return ValidationResult(
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        rubric_json_normalized=normalized,
    )


# ---------------------------------------------------------------------------
# compose_aria_prompt — thin wrapper around prompt_builder (owned by prompt-engineer)
# ---------------------------------------------------------------------------


def compose_aria_prompt(rubric: Rubric, cv_parsed: dict | None = None) -> str:
    """Build the Aria system prompt from the active structured rubric.

    Delegates to prompt_builder.compose_aria_prompt_from_rubric() which is
    owned by the prompt-engineer. If that function is not yet published, raises
    NotImplementedError so the caller can fall back to the legacy path.

    TODO(prompt-engineer): implement compose_aria_prompt_from_rubric in
    backend/app/services/prompt_builder.py with signature:
        compose_aria_prompt_from_rubric(rubric_json: dict, cv_parsed: dict | None) -> str
    """
    try:
        from app.services.prompt_builder import compose_aria_prompt_from_rubric  # type: ignore[attr-defined]
    except ImportError as exc:
        raise NotImplementedError(
            "compose_aria_prompt_from_rubric not yet published by prompt-engineer "
            "(expected at app.services.prompt_builder.compose_aria_prompt_from_rubric)"
        ) from exc

    rubric_dict = json.loads(rubric.rubric_json)
    return compose_aria_prompt_from_rubric(rubric_dict, cv_parsed)


# ---------------------------------------------------------------------------
# compose_evaluation_prompt — returns structured input dict for report_service
# ---------------------------------------------------------------------------


def compose_evaluation_prompt(rubric: Rubric) -> dict:
    """Build the structured evaluation context dict for Claude report generation.

    report_service passes this dict into the Claude user message when
    interview.rubric_version_used_id is set.

    Shape (documented for prompt-engineer / report_service):
    {
      "rubric_name": str,
      "rubric_version": int,
      "skill_list": [{"id": str, "label": str, "weight": float}],
      "level_descriptors": {skill_id: {"junior": str, "mid": str, ...}},
      "exclusions": {"do_not_ask_about": [...], "do_not_score_on": [...]},
      "stages": [{"id": str, "label": str, "duration_minutes": int, "skills_evaluated": [...]}],
      "seniority": str,
      "language_default": str,
    }
    """
    rubric_dict = json.loads(rubric.rubric_json)

    skill_list = [
        {
            "id": s["id"],
            "label": s.get("label", s["id"]),
            "weight": s.get("weight", 0.0),
            "must_probe": s.get("must_probe", []),
        }
        for s in rubric_dict.get("skills", [])
    ]

    level_descriptors = {
        s["id"]: s.get("level_descriptors", {})
        for s in rubric_dict.get("skills", [])
    }

    return {
        "rubric_name": rubric.name,
        "rubric_version": rubric.version,
        "skill_list": skill_list,
        "level_descriptors": level_descriptors,
        "exclusions": rubric_dict.get("exclusions", {}),
        "stages": rubric_dict.get("stages", []),
        "seniority": rubric_dict.get("seniority", ""),
        "language_default": rubric_dict.get("language_default", "fr"),
    }


# ---------------------------------------------------------------------------
# create_rubric — DB write
# ---------------------------------------------------------------------------


async def create_rubric(
    session: Session,
    role_id: int,
    rubric_json_dict: dict,
    created_by: str,
    name: str | None = None,
) -> Rubric:
    """Validate, normalize, version, and persist a new Rubric row.

    - Never auto-activates (is_active=False always on creation).
    - Computes version = max existing version for role + 1 (or 1 for first).
    - Raises ValueError if validation fails.
    """
    # Fetch role to get duration for stage duration validation.
    role = session.get(Role, role_id)
    if role is None:
        raise ValueError(f"Role {role_id} not found")

    result = validate_rubric(rubric_json_dict, role.duration_minutes)
    if not result.ok:
        raise ValueError("Rubric validation failed: " + "; ".join(result.errors))

    # Compute next version number (max + 1, or 1 if no prior version).
    existing_versions = session.exec(
        select(Rubric.version).where(Rubric.role_id == role_id)
    ).all()
    next_version = (max(existing_versions) + 1) if existing_versions else 1

    # Derive a sensible name if not provided.
    if not name:
        role_title = result.rubric_json_normalized.get("role_title") or role.title
        name = f"{role_title} v{next_version}"

    rubric = Rubric(
        role_id=role_id,
        version=next_version,
        is_active=False,
        name=name,
        rubric_json=json.dumps(result.rubric_json_normalized, ensure_ascii=False),
        created_by=created_by,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),  # store as UTC naive
    )

    session.add(rubric)
    session.commit()
    session.refresh(rubric)

    logger.info(
        "rubric.created",
        extra={
            "role_id": role_id,
            "rubric_version": next_version,
            "created_by_hash": hash(created_by),  # RGPD: never log raw email above DEBUG
            "warnings": result.warnings,
        },
    )
    return rubric


# ---------------------------------------------------------------------------
# activate_rubric — DB write, requires prior synthetic test
# ---------------------------------------------------------------------------


async def activate_rubric(session: Session, rubric_id: int) -> Rubric:
    """Activate a rubric version — deactivates all siblings in the same transaction.

    Preconditions:
    - rubric.test_results_json must be non-null (rubric has been tested).
    - The test result's differentiation_ok must be True.
    - Raises 409-equivalent ValueError if not met.
    """
    rubric = session.get(Rubric, rubric_id)
    if rubric is None:
        raise ValueError(f"Rubric {rubric_id} not found")

    # --- Verify synthetic test gate ---
    if not rubric.test_results_json:
        raise ValueError(
            "Rubric must be tested before activation. "
            "Call POST /api/rubrics/{rubric_id}/test first."
        )

    try:
        test_results = json.loads(rubric.test_results_json)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError(f"Rubric test_results_json is corrupted: {exc}") from exc

    if not test_results.get("differentiation_ok"):
        warnings = test_results.get("warnings", [])
        raise ValueError(
            "Rubric cannot be activated: synthetic test did not achieve sufficient "
            "differentiation (senior_overall - junior_overall < 1.5). "
            f"Test warnings: {warnings}. Revise level_descriptors and re-test."
        )

    # Stub-mode results are not real Claude calls; reject when an Anthropic key is
    # configured (i.e. we're in any real env). LOW-1 from security review.
    from app.core.config import settings
    if test_results.get("stub_mode") and getattr(settings, "ANTHROPIC_API_KEY", None):
        raise ValueError(
            "Rubric was tested in stub mode (no real Claude calls). "
            "Re-run the synthetic test in an environment with the prompt module loaded."
        )

    # --- Deactivate all siblings ---
    siblings = session.exec(
        select(Rubric).where(Rubric.role_id == rubric.role_id, Rubric.id != rubric_id)
    ).all()
    for sibling in siblings:
        if sibling.is_active:
            sibling.is_active = False
            session.add(sibling)

    rubric.is_active = True
    session.add(rubric)
    session.commit()
    session.refresh(rubric)

    logger.info(
        "rubric.activated",
        extra={
            "rubric_id": rubric_id,
            "role_id": rubric.role_id,
            "version": rubric.version,
            "siblings_deactivated": len([s for s in siblings if not s.is_active]),
        },
    )
    return rubric


# ---------------------------------------------------------------------------
# run_synthetic_test — calls Claude-based synthetic candidate simulator
# ---------------------------------------------------------------------------


async def run_synthetic_test(session: Session, rubric_id: int) -> dict:
    """Run 3 synthetic candidate simulations (junior / mid / senior) and score them.

    Calls the synthetic candidate simulator (owned by prompt-engineer) at three
    seniority levels. Each simulated transcript is fed through compose_evaluation_prompt
    for scoring by Claude. Writes results to rubric.test_results_json and
    rubric.last_tested_at.

    differentiation_ok = True iff senior_overall - junior_overall >= 1.5 on [0,10].

    TODO(prompt-engineer): implement the following in
    backend/app/services/prompts/synthetic_candidate.py:
        async def simulate_candidate_transcript(
            rubric_json: dict,
            candidate_level: str,   # "junior" | "mid" | "senior"
        ) -> list[dict]:            # transcript turns [{role, text, time_in_call_secs}]
    """
    rubric = session.get(Rubric, rubric_id)
    if rubric is None:
        raise ValueError(f"Rubric {rubric_id} not found")

    rubric_dict = json.loads(rubric.rubric_json)

    # --- Attempt to import SDK wrappers from synthetic_runner ---
    # synthetic_runner.simulate_candidate_transcript / score_transcript_against_rubric
    # are backend SDK plumbing (in app.services.synthetic_runner).
    # They in turn import prompt constants from app.services.prompts.synthetic_candidate
    # and app.services.prompts.evaluation (owned by prompt-engineer).
    # Any ImportError (missing prompt modules) propagates up from synthetic_runner and
    # is caught here so the stub fallback keeps the endpoint exercisable.
    try:
        from app.services.synthetic_runner import (
            simulate_candidate_transcript,
            score_transcript_against_rubric,
        )
        simulator_available = True
    except ImportError:
        # Stub fallback: synthetic_runner or its prompt-engineer dependencies not yet ready.
        simulator_available = False

    candidate_levels = ["junior", "mid", "senior"]
    simulations: list[dict] = []

    if simulator_available:
        for level in candidate_levels:
            try:
                transcript = await simulate_candidate_transcript(rubric_dict, level)
                skill_scores, overall = await score_transcript_against_rubric(
                    rubric_dict, transcript
                )
                simulations.append(
                    {
                        "candidate_level": level,
                        "overall_score": round(overall, 1),
                        "skill_scores": {k: round(v, 1) for k, v in skill_scores.items()},
                    }
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "synthetic_test.simulation_failed",
                    extra={"rubric_id": rubric_id, "level": level, "error": str(exc)},
                )
                simulations.append(
                    {
                        "candidate_level": level,
                        "overall_score": 0.0,
                        "skill_scores": {},
                    }
                )
    else:
        # Stub fallback — returns hard-coded scores so the endpoint is exercisable
        # while prompt-engineer's module is pending. Marked as stub in warnings.
        simulations = [
            {
                "candidate_level": "junior",
                "overall_score": 3.5,
                "skill_scores": {s["id"]: 3.5 for s in rubric_dict.get("skills", [])},
            },
            {
                "candidate_level": "mid",
                "overall_score": 5.5,
                "skill_scores": {s["id"]: 5.5 for s in rubric_dict.get("skills", [])},
            },
            {
                "candidate_level": "senior",
                "overall_score": 7.5,
                "skill_scores": {s["id"]: 7.5 for s in rubric_dict.get("skills", [])},
            },
        ]

    # Compute differentiation from the simulations we have.
    scores_by_level = {sim["candidate_level"]: sim["overall_score"] for sim in simulations}
    junior_score = scores_by_level.get("junior", 0.0)
    senior_score = scores_by_level.get("senior", 0.0)
    spread = senior_score - junior_score
    differentiation_ok = spread >= 1.5

    warnings: list[str] = []
    if not simulator_available:
        warnings.append(
            "STUB: synthetic_candidate module not yet available. "
            "Scores are hard-coded placeholders. "
            "TODO: import app.services.prompts.synthetic_candidate once published."
        )
    if not differentiation_ok:
        warnings.append(
            f"Insufficient differentiation: senior({senior_score}) - junior({junior_score}) "
            f"= {spread:.1f} (need ≥ 1.5). Revisit level_descriptors."
        )

    test_results: dict[str, Any] = {
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "simulations": simulations,
        "differentiation_ok": differentiation_ok,
        "stub_mode": not simulator_available,
        "warnings": warnings,
    }

    # Persist results.
    rubric.test_results_json = json.dumps(test_results, ensure_ascii=False)
    rubric.last_tested_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(rubric)
    session.commit()
    session.refresh(rubric)

    logger.info(
        "rubric.tested",
        extra={
            "rubric_id": rubric_id,
            "differentiation_ok": differentiation_ok,
            "spread": spread,
            "stub_mode": not simulator_available,
        },
    )
    return test_results


# ---------------------------------------------------------------------------
# get_active_rubric_for_role — used by screenings.py interview creation hook
# ---------------------------------------------------------------------------


def get_active_rubric_for_role(session: Session, role_id: int) -> Optional[Rubric]:
    """Return the single active Rubric for a role, or None if no active rubric exists."""
    return session.exec(
        select(Rubric).where(Rubric.role_id == role_id, Rubric.is_active == True)  # noqa: E712
    ).first()
