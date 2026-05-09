"""Initial schema — baseline for role and interview tables.

Revision ID: 0001
Revises:
Create Date: 2026-05-05 00:00:00.000000 UTC

Design note on baseline strategy:
  The `role` and `interview` tables were originally created via
  SQLModel.metadata.create_all() and were never tracked by Alembic.
  This migration captures the exact schema that was in production at the time
  Alembic was introduced. It uses checkfirst=True so that running
  `alembic upgrade head` against an existing dev DB that already has these
  tables is a safe no-op (the tables are not recreated).

  To stamp an existing DB without running DDL:
      alembic stamp 0001
  Then proceed to `alembic upgrade head` to apply 0002 onward.

  On a fresh DB, `alembic upgrade head` creates everything from scratch.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401 — needed for sqlmodel.AutoString type resolution
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # checkfirst=True: no-op if the table already exists (existing dev DBs are safe).
    op.create_table(
        "role",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_token", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("seniority", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("tone", sa.String(), nullable=False),
        sa.Column("stages_json", sa.String(), nullable=False),
        sa.Column("skills_json", sa.String(), nullable=False),
        sa.Column("system_prompt", sa.String(), nullable=False),
        sa.Column("first_message", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_role_public_token"), "role", ["public_token"],
        unique=True, if_not_exists=True,
    )

    op.create_table(
        "interview",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_token", sa.String(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("candidate_name", sa.String(), nullable=False),
        sa.Column("candidate_email", sa.String(), nullable=False),
        sa.Column("elevenlabs_conversation_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("transcript_json", sa.String(), nullable=True),
        sa.Column("analysis_json", sa.String(), nullable=True),
        sa.Column("visual_metrics_json", sa.String(), nullable=True),
        sa.Column("report_json", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["role.id"]),
        sa.PrimaryKeyConstraint("id"),
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_interview_public_token"), "interview", ["public_token"],
        unique=True, if_not_exists=True,
    )
    op.create_index(
        op.f("ix_interview_role_id"), "interview", ["role_id"],
        unique=False, if_not_exists=True,
    )
    op.create_index(
        op.f("ix_interview_elevenlabs_conversation_id"),
        "interview", ["elevenlabs_conversation_id"],
        unique=False, if_not_exists=True,
    )


def downgrade() -> None:
    # Downgrade drops the tables entirely — only safe on a dev DB that
    # has no data, or as part of a full database teardown.
    op.drop_index(op.f("ix_interview_elevenlabs_conversation_id"), table_name="interview")
    op.drop_index(op.f("ix_interview_role_id"), table_name="interview")
    op.drop_index(op.f("ix_interview_public_token"), table_name="interview")
    op.drop_table("interview")
    op.drop_index(op.f("ix_role_public_token"), table_name="role")
    op.drop_table("role")
