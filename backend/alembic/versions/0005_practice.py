"""Add practicesession table for candidate-practice-mode skill.

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-05 00:05:00.000000 UTC

Changes:
  NEW TABLE: practicesession
    Columns: id, public_token, role_type, seniority, language,
             duration_choice, candidate_email, referrer_token,
             elevenlabs_conversation_id, transcript_json,
             practice_report_json, abuse_flags, session_received_at,
             started_at, completed_at

  ISOLATION INVARIANT: NO foreign keys to any HR-side table (role, interview,
  rubric, evaluationoverride). This is the structural guarantee that practice
  data never leaks into HR dashboards. Do NOT add FKs in future migrations
  without explicit architectural review.

  RGPD: 30-day retention on transcript_json, practice_report_json,
  candidate_email (purged by purge_expired_practice_sessions.py). Audit KPI
  fields (session_received_at, started_at, completed_at, role_type, seniority,
  language, duration_choice) retained indefinitely after PII removal.

  NEW INDEXES:
    - ix_practicesession_public_token          (public_token, UNIQUE)
    - ix_practicesession_referrer_token        (referrer_token)
    - ix_practicesession_elevenlabs_conv_id    (elevenlabs_conversation_id)
    - ix_practicesession_session_received_at   (session_received_at)

Backward compatibility: new table only — no existing table is modified.
Safe to apply against a live database (zero column-drops, zero renames).

Downgrade order (reverse of upgrade):
  1. Drop indexes (must precede table drop)
  2. Drop practicesession table
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401 — needed for sqlmodel.AutoString type resolution
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Create the practicesession table.
    #
    # ISOLATION GUARANTEE: no ForeignKeyConstraint to role, interview,
    # rubric, or evaluationoverride. Enforced here at the DDL level.
    # The SQLModel class mirrors this — see models.PracticeSession docstring.
    # ------------------------------------------------------------------
    op.create_table(
        "practicesession",

        # Primary key.
        sa.Column("id", sa.Integer(), nullable=False),

        # Public-facing session identifier. Never expose internal id.
        # Unique + indexed (same pattern as Interview.public_token).
        sa.Column("public_token", sa.String(), nullable=False),

        # Synthetic role descriptor — NOT a FK. Validated at service layer.
        # Phase 1 values: "backend" | "frontend" | "data"
        sa.Column("role_type", sa.String(), nullable=False),

        # "junior" | "mid" | "senior" | "staff"
        sa.Column("seniority", sa.String(), nullable=False),

        # "fr" | "en" (Phase 2: "ar")
        sa.Column("language", sa.String(), nullable=False),

        # "short" (10 min) | "medium" (25 min)
        sa.Column("duration_choice", sa.String(), nullable=False),

        # RGPD: optional email for report delivery. NULL for anonymous sessions.
        # Retention: 30 days from session_received_at, then NULL out.
        sa.Column("candidate_email", sa.String(), nullable=True),

        # Referral token from ?ref= query param. Indexed for viral KPI queries.
        # NOT a DB-level FK (self-referential complexity avoided; app-layer only).
        sa.Column("referrer_token", sa.String(), nullable=True),

        # ElevenLabs conversation ID. Indexed for O(1) webhook dispatch.
        sa.Column("elevenlabs_conversation_id", sa.String(), nullable=True),

        # RGPD: full transcript from ElevenLabs webhook. PII.
        # Retention: 30 days from session_received_at, then NULL out.
        sa.Column("transcript_json", sa.Text(), nullable=True),

        # RGPD: Claude-generated formative report (no numeric score). PII.
        # Shape: PracticeReportSchema. Retention: 30 days, then NULL out.
        sa.Column("practice_report_json", sa.Text(), nullable=True),

        # Anti-bot flag. NULL = clean. Comma-separated reason codes when flagged.
        # NEVER causes automatic rejection (CLAUDE.md rule #1). Human review only.
        sa.Column("abuse_flags", sa.String(), nullable=True),

        # RGPD retention anchor. 30-day clock starts here. Indexed for purge queries.
        # Retained indefinitely as non-PII KPI anchor after PII fields are NULLed.
        sa.Column("session_received_at", sa.DateTime(), nullable=False),

        # Session lifecycle. Both UTC. Retained for KPI aggregation after PII purge.
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),

        sa.PrimaryKeyConstraint("id"),
        # NOTE: deliberately no ForeignKeyConstraint — isolation invariant.
    )

    # Unique index on public_token: used by every session-lookup endpoint.
    op.create_index(
        "ix_practicesession_public_token",
        "practicesession",
        ["public_token"],
        unique=True,
    )

    # Index on referrer_token: used for viral referral attribution KPI queries.
    # Non-unique; many sessions can share the same referrer.
    op.create_index(
        "ix_practicesession_referrer_token",
        "practicesession",
        ["referrer_token"],
        unique=False,
    )

    # Index on elevenlabs_conversation_id: O(1) webhook dispatch lookup.
    op.create_index(
        "ix_practicesession_elevenlabs_conv_id",
        "practicesession",
        ["elevenlabs_conversation_id"],
        unique=False,
    )

    # Index on session_received_at: used by the purge script (daily range scan)
    # and KPI aggregation queries (GROUP BY date ranges).
    op.create_index(
        "ix_practicesession_session_received_at",
        "practicesession",
        ["session_received_at"],
        unique=False,
    )


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse order: drop indexes first (required before table drop),
    # then drop the table.
    # ------------------------------------------------------------------

    # 1. Drop all practicesession indexes.
    op.drop_index("ix_practicesession_session_received_at", table_name="practicesession")
    op.drop_index("ix_practicesession_elevenlabs_conv_id", table_name="practicesession")
    op.drop_index("ix_practicesession_referrer_token", table_name="practicesession")
    op.drop_index("ix_practicesession_public_token", table_name="practicesession")

    # 2. Drop the table.
    op.drop_table("practicesession")
