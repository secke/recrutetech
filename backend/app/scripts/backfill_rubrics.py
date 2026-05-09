"""Backfill script: create a draft v1 Rubric for every existing Role that
does not yet have one.

Usage:
    python -m app.scripts.backfill_rubrics --dry-run   # preview only
    python -m app.scripts.backfill_rubrics             # commit to DB

This script is IDEMPOTENT: it skips any Role that already has at least one
Rubric row (any version). Re-running it is always safe.

Hard rules applied:
- is_active is always set to False. No rubric is auto-activated.
  Activation requires: human review + synthetic-candidate test pass
  (differentiation >= 1.5 pts) via the rubric_service.
- system_prompt on Role is NOT modified. Phase 1 coexistence: both fields
  remain valid until the 6-month sunset (see SKILL.md §9).
- The stub rubric_json contains the mandatory exclusions pre-populated
  (inviolable by RGPD / anti-bias rules) and an empty skills list.

TODO (prompt-engineer + backend-engineer handoff):
  rubric_service.parse_system_prompt_to_rubric(role) should call Claude
  with the role's system_prompt and replace the stub rubric_json with a
  structured rubric derived from it. This script deliberately does NOT do
  that — it only creates the row so that the schema is in place.
  See app/services/rubric_service.py for the intended implementation point.

Field names used (for backend-engineer reference):
    Rubric.role_id          = role.id
    Rubric.version          = 1
    Rubric.is_active        = False
    Rubric.name             = f"{role.title} v1 (draft)"
    Rubric.rubric_json      = JSON string (stub, see _build_stub_rubric_json)
    Rubric.created_by       = "system:backfill"
    Rubric.created_at       = datetime.utcnow()
    Rubric.last_tested_at   = None
    Rubric.test_results_json = None
"""

import argparse
import json
import sys
from datetime import datetime, timezone

from sqlmodel import Session, select

# Ensure the app package is importable when run as `python -m app.scripts.backfill_rubrics`
# from inside the backend/ directory.
from app.db import engine
from app.models import Role, Rubric


# ---------------------------------------------------------------------------
# Mandatory exclusions — always present, cannot be removed by HR (RGPD + bias).
# ---------------------------------------------------------------------------
from app.services.rubric_service import (  # canonical source of truth
    _MANDATORY_DO_NOT_ASK,
    _MANDATORY_DO_NOT_SCORE,
)


def _build_stub_rubric_json(role: Role) -> str:
    """Build the minimal stub rubric_json for a Role.

    The skills list is intentionally empty. The prompt-engineer + backend-engineer
    must implement rubric_service.parse_system_prompt_to_rubric() to populate it
    from role.system_prompt via a Claude call.

    TODO (backend-engineer): replace this stub in rubric_service.py after creation,
    using Claude to parse role.system_prompt into the full structured format.
    Acceptance criteria: weights sum to 1.0, 1-8 skills, all level_descriptors filled.
    """
    stub = {
        "role_title": role.title,
        "seniority": role.seniority,
        "language_default": role.language,
        "languages_supported": [role.language] if role.language != "fr" else ["fr", "en"],
        "duration_target_minutes": role.duration_minutes,
        # TODO (prompt-engineer + backend-engineer): populate skills from role.system_prompt
        # via Claude (rubric_service.parse_system_prompt_to_rubric). Weights must sum to 1.0.
        "skills": [],
        # TODO (backend-engineer): populate stages from role.stages_json or derive from rubric.
        "stages": [],
        # Mandatory exclusions — pre-populated. Inviolable (service layer must reject
        # any attempt to remove items from the mandatory set).
        "exclusions": {
            "do_not_ask_about": list(_MANDATORY_DO_NOT_ASK),
            "do_not_score_on": list(_MANDATORY_DO_NOT_SCORE),
        },
        "defense_questions": {
            "enabled": False,  # enable once anti-cheating-integrity-layer is implemented
            "min_per_session": 2,
            "max_per_session": 4,
            "from_skill": "anti-cheating-integrity-layer",
        },
        "language_handling": {
            "candidate_can_switch_language": True,
            "score_unaffected_by_language_proficiency": True,
        },
        "_stub": True,  # flag for rubric_service to detect unparsed stubs
        "_stub_source": "backfill_rubrics:v1",
    }
    return json.dumps(stub, ensure_ascii=False, indent=2)


def backfill(dry_run: bool = False) -> None:
    """Main backfill logic.

    Args:
        dry_run: If True, print what would happen without writing to the DB.
    """
    created = 0
    skipped = 0

    with Session(engine) as session:
        roles = session.exec(select(Role)).all()

        if not roles:
            print("No roles found in the database. Nothing to backfill.")
            return

        for role in roles:
            # Check if this role already has any rubric (idempotent guard).
            existing = session.exec(
                select(Rubric).where(Rubric.role_id == role.id).limit(1)
            ).first()

            if existing is not None:
                print(
                    f"  SKIP  role id={role.id!r} title={role.title!r} "
                    f"— already has rubric v{existing.version}"
                )
                skipped += 1
                continue

            rubric = Rubric(
                role_id=role.id,
                version=1,
                is_active=False,  # NEVER auto-activate
                name=f"{role.title} v1 (draft)",
                rubric_json=_build_stub_rubric_json(role),
                created_by="system:backfill",
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                last_tested_at=None,
                test_results_json=None,
            )

            if dry_run:
                print(
                    f"  DRY   role id={role.id!r} title={role.title!r} "
                    f"— would create Rubric(version=1, is_active=False, name={rubric.name!r})"
                )
            else:
                session.add(rubric)
                print(
                    f"  CREATE role id={role.id!r} title={role.title!r} "
                    f"— created Rubric(version=1, is_active=False)"
                )
            created += 1

        if not dry_run:
            session.commit()

    mode = "DRY RUN — " if dry_run else ""
    print(
        f"\n{mode}Summary: {created} rubric(s) {'would be ' if dry_run else ''}created, "
        f"{skipped} skipped (already had a rubric)."
    )
    if dry_run and created > 0:
        print("Run without --dry-run to commit.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Backfill draft v1 Rubric rows for Roles that have none.",
        epilog=(
            "This script is idempotent. Roles that already have a Rubric row "
            "are skipped. No rubric is activated automatically."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Preview what would be created without writing to the database.",
    )
    args = parser.parse_args()
    backfill(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
