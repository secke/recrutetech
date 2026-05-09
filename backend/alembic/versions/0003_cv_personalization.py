"""Add CV personalization columns to interview table.

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-05 00:03:00.000000 UTC

Changes:
  MODIFIED TABLE: interview
    ADD COLUMN cv_text                TEXT NULL
      -- RGPD: raw CV content under Article 9 consent. Purge after 90 days.
    ADD COLUMN cv_parsed_json         TEXT NULL
      -- RGPD: structured CVParsedSchema (JSON string). Purge after 90 days.
    ADD COLUMN personalized_prompt    TEXT NULL
      -- RGPD: composed Aria system prompt with candidate context. Purge after 90 days.
    ADD COLUMN cv_consent_processing  BOOLEAN NOT NULL DEFAULT FALSE
      -- Granular Art. 9 consent flag. Retained as audit trail after purge.
    ADD COLUMN cv_received_at         DATETIME NULL
      -- UTC anchor for 90-day retention window. Retained as audit trail after purge.

  NEW INDEXES:
    - ix_interview_cv_consent_processing  (interview.cv_consent_processing)

Expand-contract rule: all new columns are nullable (or boolean with safe default=False).
No existing column is renamed or dropped. Safe to apply against live databases.

Downgrade order (reverse of upgrade):
  1. Drop index ix_interview_cv_consent_processing
  2. Drop the 5 CV columns in reverse order
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Add the 5 CV personalization columns to the interview table.
    # batch_alter_table is required for SQLite ALTER TABLE compatibility.
    # All columns nullable / boolean-with-default for backward compatibility
    # (existing rows receive NULL / False automatically).
    # ------------------------------------------------------------------
    with op.batch_alter_table("interview") as batch_op:
        # RGPD: raw CV content. PII. Retention: 90 days from cv_received_at.
        batch_op.add_column(
            sa.Column("cv_text", sa.Text(), nullable=True)
        )

        # RGPD: structured CVParsedSchema JSON string. PII. Retention: 90 days.
        # Shape documented in SKILL.md §3.2 and app/services/cv_parser_service.py.
        batch_op.add_column(
            sa.Column("cv_parsed_json", sa.Text(), nullable=True)
        )

        # RGPD: composed Aria system prompt with candidate context. PII. Retention: 90 days.
        # Injection gated by settings.CV_PERSONALIZATION_INJECT (Phase 1 silent = False).
        batch_op.add_column(
            sa.Column("personalized_prompt", sa.Text(), nullable=True)
        )

        # Granular Article 9 RGPD consent for AI processing of CV content.
        # DEFAULT FALSE: existing rows (pre-consent) correctly show no consent granted.
        # Retained as non-PII audit trail after 90-day purge of cv_text etc.
        batch_op.add_column(
            sa.Column(
                "cv_consent_processing",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),  # SQLite: 0=False; PostgreSQL: FALSE
            )
        )

        # UTC timestamp when CV was first received. Anchor for the 90-day retention window.
        # NULL for interviews without a CV. Retained as non-PII audit trail after purge.
        batch_op.add_column(
            sa.Column("cv_received_at", sa.DateTime(), nullable=True)
        )

        # Index cv_consent_processing: used to locate consented interviews for
        # processing jobs and to audit non-consented rows. Low cardinality but
        # explicitly indexed per project conventions (all queried columns).
        batch_op.create_index(
            "ix_interview_cv_consent_processing",
            ["cv_consent_processing"],
            unique=False,
        )


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse order: drop index first, then columns in reverse-add order.
    # ------------------------------------------------------------------
    with op.batch_alter_table("interview") as batch_op:
        batch_op.drop_index("ix_interview_cv_consent_processing")
        batch_op.drop_column("cv_received_at")
        batch_op.drop_column("cv_consent_processing")
        batch_op.drop_column("personalized_prompt")
        batch_op.drop_column("cv_parsed_json")
        batch_op.drop_column("cv_text")
