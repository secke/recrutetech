"""Purge expired practice session PII (RGPD 30-day retention).

Run daily via cron / k8s CronJob. Wire-up out of scope; this is a callable utility.

This script NULLs out the three PII-bearing fields on PracticeSession rows whose
session_received_at is older than 30 days and where at least one of the PII fields
is still non-NULL:

  - PracticeSession.transcript_json        (verbatim session transcript, PII)
  - PracticeSession.practice_report_json   (Claude formative report w/ transcript quotes, PII)
  - PracticeSession.candidate_email        (optional email for report delivery, PII)

Fields intentionally RETAINED as non-PII KPI audit trail:
  - PracticeSession.session_received_at    (retention anchor — timestamp only)
  - PracticeSession.started_at             (session lifecycle KPI)
  - PracticeSession.completed_at           (session lifecycle KPI)
  - PracticeSession.role_type              (KPI: sessions by role)
  - PracticeSession.seniority              (KPI: sessions by seniority)
  - PracticeSession.language               (KPI: sessions by language)
  - PracticeSession.duration_choice        (KPI: sessions by duration)
  - PracticeSession.referrer_token         (KPI: viral referral attribution)
  - PracticeSession.abuse_flags            (KPI: abuse detection rates)
  - PracticeSession.public_token           (required to serve the session-report page
                                            even after PII purge; no PII in the token)
  - PracticeSession.elevenlabs_conversation_id  (audit linkage to ElevenLabs logs)

RGPD basis: Article 5(1)(e) — storage limitation. 30-day retention is shorter than
the 90-day window on Interview (reflects that practice data is lower-stakes and the
candidate expectation is ephemeral use). Per SKILL.md §4.

Usage:
    python -m app.scripts.purge_expired_practice_sessions           # live purge
    python -m app.scripts.purge_expired_practice_sessions --dry-run # preview only

Output format:
    purged=N skipped=M total_eligible=K

This script is idempotent: rows where all three PII fields are already NULL are
counted in total_eligible but not rewritten. Safe to re-run at any frequency.
"""

import argparse
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import PracticeSession

# ---------------------------------------------------------------------------
# Retention constant
# ---------------------------------------------------------------------------
PRACTICE_RETENTION_DAYS = 30


def purge_expired_practice_sessions(dry_run: bool = False) -> None:
    """Select and NULL out expired practice session PII fields.

    Args:
        dry_run: When True, identify eligible rows and print the summary but
                 do NOT commit any changes to the database.

    Eligibility criteria:
      - session_received_at < (now UTC - 30 days)
      - At least one of transcript_json, practice_report_json, candidate_email
        is non-NULL (already-fully-purged rows are skipped to avoid pointless writes
        but still counted in total_eligible).
    """
    cutoff = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        - timedelta(days=PRACTICE_RETENTION_DAYS)
    )

    purged = 0
    skipped = 0
    total_eligible = 0

    with Session(engine) as session:
        # Fetch all rows past the retention cutoff.
        # We do NOT filter on non-NULL PII fields here; we count already-purged
        # rows separately so total_eligible reflects all rows past the window.
        stmt = select(PracticeSession).where(
            PracticeSession.session_received_at < cutoff  # type: ignore[operator]
        )
        rows = session.exec(stmt).all()
        total_eligible = len(rows)

        for ps in rows:
            # All three PII fields already NULL — idempotent skip.
            if (
                ps.transcript_json is None
                and ps.practice_report_json is None
                and ps.candidate_email is None
            ):
                skipped += 1
                continue

            if dry_run:
                print(
                    f"  DRY   practice_session id={ps.id!r} token={ps.public_token!r} "
                    f"session_received_at={ps.session_received_at!r} — would purge "
                    f"transcript_json, practice_report_json, candidate_email"
                )
            else:
                ps.transcript_json = None
                ps.practice_report_json = None
                ps.candidate_email = None
                session.add(ps)
                print(
                    f"  PURGE practice_session id={ps.id!r} token={ps.public_token!r} "
                    f"session_received_at={ps.session_received_at!r}"
                )
            purged += 1

        if not dry_run:
            session.commit()

    mode = "DRY RUN — " if dry_run else ""
    print(f"\n{mode}purged={purged} skipped={skipped} total_eligible={total_eligible}")
    if dry_run and purged > 0:
        print("Run without --dry-run to commit.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            f"Purge practice session PII (transcript_json, practice_report_json, "
            f"candidate_email) from PracticeSession rows older than "
            f"{PRACTICE_RETENTION_DAYS} days (RGPD retention)."
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
    purge_expired_practice_sessions(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
