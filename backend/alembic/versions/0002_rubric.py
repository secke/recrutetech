"""Add rubric table and interview.rubric_version_used_id FK column.

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-05 00:01:00.000000 UTC

Changes:
  NEW TABLE: rubric
    - id, role_id (FK -> role.id), version, is_active, name, rubric_json,
      created_by, created_at, last_tested_at, test_results_json

  MODIFIED TABLE: interview
    - ADD COLUMN rubric_version_used_id INTEGER NULL FK -> rubric.id
      (expand-contract phase 1: nullable, so existing rows stay valid)

  NEW INDEXES:
    - ix_rubric_role_id           (rubric.role_id)
    - ix_rubric_is_active         (rubric.is_active)
    - uq_rubric_role_id_version   (rubric.role_id, rubric.version) UNIQUE
    - ix_interview_rubric_version_used_id  (interview.rubric_version_used_id)

Downgrade order (reverse of upgrade):
  1. Drop FK column from interview
  2. Drop all rubric indexes
  3. Drop rubric table
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create the rubric table.
    # ------------------------------------------------------------------
    op.create_table(
        "rubric",
        sa.Column("id", sa.Integer(), nullable=False),
        # FK to role; indexed explicitly (SQLite does not auto-index FKs).
        sa.Column("role_id", sa.Integer(), nullable=False),
        # Monotonically increasing per role. Composite unique enforced below.
        sa.Column("version", sa.Integer(), nullable=False),
        # Only one rubric per role should be active at a time (app-layer invariant).
        # Partial unique index omitted for SQLite portability.
        sa.Column("is_active", sa.Boolean(), nullable=False),
        # Human-readable label, e.g. "Backend Mid v1"
        sa.Column("name", sa.String(), nullable=False),
        # Full structured rubric JSON stored as TEXT.
        # Pydantic schema documented in Rubric model docstring and rubric_service.py.
        sa.Column("rubric_json", sa.Text(), nullable=False),
        # Free string for now; TODO normalise to User FK (see models.py TODO comment).
        sa.Column("created_by", sa.String(), nullable=False),
        # All datetimes UTC.
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_tested_at", sa.DateTime(), nullable=True),
        # JSON text — output of synthetic-candidate test simulations.
        sa.Column("test_results_json", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["role_id"], ["role.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Index on role_id (FK — SQLite does not auto-index).
    op.create_index("ix_rubric_role_id", "rubric", ["role_id"], unique=False)

    # Index on is_active — used to quickly find the active rubric for a role.
    op.create_index("ix_rubric_is_active", "rubric", ["is_active"], unique=False)

    # Composite unique index: (role_id, version) — enforces monotonic versioning.
    op.create_index(
        "uq_rubric_role_id_version",
        "rubric",
        ["role_id", "version"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # 2. Add nullable FK column to interview (expand-contract phase 1).
    #    NULL = interview predates the rubric feature; NOT NULL expected for
    #    all new interviews once rubric_service is wired in.
    #    batch_alter_table is used for SQLite ALTER TABLE compatibility.
    #    ForeignKey constraint added via create_foreign_key (not inline in
    #    add_column) because SQLite batch mode requires named constraints.
    # ------------------------------------------------------------------
    with op.batch_alter_table("interview") as batch_op:
        batch_op.add_column(
            sa.Column(
                "rubric_version_used_id",
                sa.Integer(),
                nullable=True,
            )
        )
        batch_op.create_foreign_key(
            "fk_interview_rubric_version_used_id",
            "rubric",
            ["rubric_version_used_id"],
            ["id"],
        )
        batch_op.create_index(
            "ix_interview_rubric_version_used_id",
            ["rubric_version_used_id"],
            unique=False,
        )


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse order: FK column first, then rubric indexes, then table.
    # ------------------------------------------------------------------

    # 1. Drop the FK column added to interview.
    with op.batch_alter_table("interview") as batch_op:
        batch_op.drop_index("ix_interview_rubric_version_used_id")
        batch_op.drop_constraint("fk_interview_rubric_version_used_id", type_="foreignkey")
        batch_op.drop_column("rubric_version_used_id")

    # 2. Drop rubric indexes (must precede table drop).
    op.drop_index("uq_rubric_role_id_version", table_name="rubric")
    op.drop_index("ix_rubric_is_active", table_name="rubric")
    op.drop_index("ix_rubric_role_id", table_name="rubric")

    # 3. Drop rubric table.
    op.drop_table("rubric")
