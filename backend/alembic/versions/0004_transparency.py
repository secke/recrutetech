"""Add transparency/explainability columns and EvaluationOverride table.

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-05 00:04:00.000000 UTC

Changes:
  MODIFIED TABLE: interview
    ADD COLUMN report_integrity_hash  TEXT NULL
      -- SHA-256 over canonical inputs; NOT PII; retained indefinitely.
      -- RGPD Art. 22 / EU AI Act Art. 12 audit reproducibility.
    ADD COLUMN share_with_candidate   BOOLEAN NOT NULL DEFAULT FALSE
      -- HR opt-in gate for the candidate-view endpoint. Default False.
      -- RGPD §6 Mode RH only: prevents accidental leakage.

  NEW INDEXES:
    - ix_interview_share_with_candidate  (interview.share_with_candidate)

  NEW TABLE: evaluationoverride
    Columns: id, interview_id (FK->interview.id), skill_id, original_score,
             override_score, justification, created_by, created_at
    Append-only: rows are immutable once inserted.
    EU AI Act Art. 12 / RGPD Art. 22: full audit trail of HR score corrections.

  NEW INDEXES on evaluationoverride:
    - ix_evaluationoverride_interview_id   (evaluationoverride.interview_id)
    - ix_evaluationoverride_created_at     (evaluationoverride.created_at)
    - ix_evaluationoverride_interview_skill (evaluationoverride.interview_id, skill_id)

Expand-contract rule:
  All new columns on interview are nullable or boolean with safe server_default.
  No existing column is renamed or dropped. Safe to apply against live databases.

Downgrade order (reverse of upgrade):
  1. Drop all indexes on evaluationoverride
  2. Drop evaluationoverride table
  3. Drop ix_interview_share_with_candidate
  4. Drop share_with_candidate column from interview
  5. Drop report_integrity_hash column from interview
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401 — needed for sqlmodel.AutoString type resolution
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Add transparency columns to the interview table.
    #    batch_alter_table is required for SQLite ALTER TABLE compatibility.
    # ------------------------------------------------------------------
    with op.batch_alter_table("interview") as batch_op:
        # SHA-256 integrity hash for EU AI Act Art. 12 / RGPD Art. 22 audit.
        # NULL for interviews created before this migration.
        # Computed by report_service at evaluation time; not PII; retained indefinitely.
        batch_op.add_column(
            sa.Column("report_integrity_hash", sa.Text(), nullable=True)
        )

        # HR opt-in gate for the candidate-view endpoint.
        # server_default="0" is portable: SQLite stores BOOLEAN as INTEGER 0/1,
        # PostgreSQL accepts "0" as the boolean false literal via implicit cast.
        # Existing rows (pre-migration) correctly default to False (no sharing).
        batch_op.add_column(
            sa.Column(
                "share_with_candidate",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )

        # Index share_with_candidate: every candidate-view route request filters on it.
        # Low cardinality (mostly False) but explicit per project convention.
        batch_op.create_index(
            "ix_interview_share_with_candidate",
            ["share_with_candidate"],
            unique=False,
        )

    # ------------------------------------------------------------------
    # 2. Create the evaluationoverride table.
    #    APPEND-ONLY: rows are immutable once inserted; a new row supersedes
    #    an older one for the same (interview_id, skill_id) pair (latest wins).
    #    The original report_json on Interview is NEVER mutated.
    # ------------------------------------------------------------------
    op.create_table(
        "evaluationoverride",
        sa.Column("id", sa.Integer(), nullable=False),

        # FK to the interview being overridden. Indexed (SQLite FK quirk).
        sa.Column("interview_id", sa.Integer(), nullable=False),

        # Matches rubric.rubric_json["skills"][*]["id"] — snake_case, e.g. "python".
        # Not a DB-level FK (rubric_json is a JSON document); validated at service layer.
        sa.Column("skill_id", sa.String(), nullable=False),

        # Original Claude-generated score copied at override time. 0.0–5.0, one decimal.
        sa.Column("original_score", sa.Float(), nullable=False),

        # HR-assigned corrected score. 0.0–5.0, one decimal precision.
        sa.Column("override_score", sa.Float(), nullable=False),

        # Human justification. Minimum 30 chars enforced at API layer.
        # Required for RGPD Art. 22 right-to-explanation traceability.
        sa.Column("justification", sa.Text(), nullable=False),

        # Identity of the HR user. Auth stub: "admin". TODO FK to User.id (Wave 2).
        sa.Column("created_by", sa.String(), nullable=False),

        # UTC creation timestamp. Indexed for "latest override" queries.
        sa.Column("created_at", sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(["interview_id"], ["interview.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Index on interview_id FK (SQLite does not auto-index FKs).
    op.create_index(
        "ix_evaluationoverride_interview_id",
        "evaluationoverride",
        ["interview_id"],
        unique=False,
    )

    # Index on created_at: used for ORDER BY created_at DESC in "latest wins" queries.
    op.create_index(
        "ix_evaluationoverride_created_at",
        "evaluationoverride",
        ["created_at"],
        unique=False,
    )

    # Composite index on (interview_id, skill_id): fast lookup of all overrides for
    # a specific skill within a specific interview. Combined with ORDER BY created_at
    # DESC LIMIT 1, this is the primary "latest override wins" query path.
    op.create_index(
        "ix_evaluationoverride_interview_skill",
        "evaluationoverride",
        ["interview_id", "skill_id"],
        unique=False,
    )


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse order: indexes first, then table, then interview columns.
    # ------------------------------------------------------------------

    # 1. Drop evaluationoverride indexes (must precede table drop).
    op.drop_index("ix_evaluationoverride_interview_skill", table_name="evaluationoverride")
    op.drop_index("ix_evaluationoverride_created_at", table_name="evaluationoverride")
    op.drop_index("ix_evaluationoverride_interview_id", table_name="evaluationoverride")

    # 2. Drop evaluationoverride table.
    op.drop_table("evaluationoverride")

    # 3. Drop interview transparency columns (reverse add order).
    with op.batch_alter_table("interview") as batch_op:
        batch_op.drop_index("ix_interview_share_with_candidate")
        batch_op.drop_column("share_with_candidate")
        batch_op.drop_column("report_integrity_hash")
