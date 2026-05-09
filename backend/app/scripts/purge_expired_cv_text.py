"""Purge expired CV PII from Interview rows (RGPD 90-day retention).

This script NULLs out the three PII-bearing CV fields on Interview rows whose
cv_received_at is older than 90 days and whose cv_text is not already NULL:

  - Interview.cv_text          (raw CV content)
  - Interview.cv_parsed_json   (structured CVParsedSchema JSON)
  - Interview.personalized_prompt (Aria system prompt embedding candidate details)

Fields intentionally RETAINED as non-PII audit trail:
  - Interview.cv_consent_processing  (boolean consent record)
  - Interview.cv_received_at         (timestamp anchor for the retention window)

RGPD basis: Article 5(1)(e) — storage limitation. Retention period is 90 days
from cv_received_at (the moment the CV was submitted). This is consistent with
the existing candidate_name / candidate_email 90-day retention policy on Interview.

Usage:
    python -m app.scripts.purge_expired_cv_text                  # live purge
    python -m app.scripts.purge_expired_cv_text --dry-run        # preview only

Output format:
    purged=N skipped=M total_eligible=K

This script is intended to run daily via cron / k8s CronJob / GitHub Actions.
Wire-up is OUT OF SCOPE for the cv-adaptive-personalization skill; this is a
callable utility only.
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import Interview

# ---------------------------------------------------------------------------
# Retention constant
# ---------------------------------------------------------------------------
CV_RETENTION_DAYS = 90


def purge_expired_cv_text(dry_run: bool = False) -> None:
    """Select and NULL out expired CV PII fields.

    Args:
        dry_run: When True, identify eligible rows and print the summary but
                 do NOT commit any changes to the database.

    Eligibility criteria:
      - cv_received_at IS NOT NULL
      - cv_received_at < (now UTC - 90 days)
      - cv_text IS NOT NULL  (already-purged rows are skipped to avoid pointless writes)
    """
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=CV_RETENTION_DAYS)

    purged = 0
    skipped = 0
    total_eligible = 0

    with Session(engine) as session:
        # Fetch candidates: cv_received_at set and older than cutoff.
        # We do NOT filter cv_text IS NOT NULL here; we count those separately
        # so the "total_eligible" figure reflects all rows past the retention window.
        stmt = select(Interview).where(
            Interview.cv_received_at.is_not(None),  # type: ignore[union-attr]
            Interview.cv_received_at < cutoff,       # type: ignore[operator]
        )
        rows = session.exec(stmt).all()
        total_eligible = len(rows)

        for interview in rows:
            # Already purged — still counted in total_eligible but not re-touched.
            if interview.cv_text is None and interview.cv_parsed_json is None and interview.personalized_prompt is None:
                skipped += 1
                continue

            if dry_run:
                print(
                    f"  DRY   interview id={interview.id!r} token={interview.public_token!r} "
                    f"cv_received_at={interview.cv_received_at!r} — would purge cv_text, "
                    f"cv_parsed_json, personalized_prompt"
                )
            else:
                interview.cv_text = None
                interview.cv_parsed_json = None
                interview.personalized_prompt = None
                session.add(interview)
                print(
                    f"  PURGE interview id={interview.id!r} token={interview.public_token!r} "
                    f"cv_received_at={interview.cv_received_at!r}"
                )
            purged += 1

        if not dry_run:
            session.commit()

    mode = "DRY RUN — " if dry_run else ""
    print(
        f"\n{mode}purged={purged} skipped={skipped} total_eligible={total_eligible}"
    )
    if dry_run and purged > 0:
        print("Run without --dry-run to commit.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            f"Purge CV PII (cv_text, cv_parsed_json, personalized_prompt) from "
            f"Interview rows older than {CV_RETENTION_DAYS} days (RGPD retention)."
        ),
        epilog=(
            "This script is idempotent: already-purged rows are counted in "
            "total_eligible but not rewritten. Safe to re-run at any frequency."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Preview eligible rows without writing any changes to the database.",
    )
    args = parser.parse_args()
    purge_expired_cv_text(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
