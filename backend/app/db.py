from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)


def init_db() -> None:
    # Import models so SQLModel registers them before create_all
    from app import models  # noqa: F401
    SQLModel.metadata.create_all(engine)
    _ensure_columns()


def _ensure_columns() -> None:
    """Forward-only column adds for SQLite during alpha.

    SQLModel.metadata.create_all() only creates missing *tables*, not new
    columns on existing ones. Until we move to Alembic, this lightweight check
    keeps local SQLite DBs upgradable in place. No-op on Postgres etc.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    expected = {
        "interview": {
            "report_json": "TEXT",
            # rubric_version_used_id added by structured-rubric-builder skill (migration 0002).
            # Nullable FK to rubric.id; NULL for pre-rubric interviews.
            "rubric_version_used_id": "INTEGER",
            # CV personalization cluster — added by cv-adaptive-personalization skill (migration 0003).
            # RGPD: cv_text, cv_parsed_json, personalized_prompt purged 90 days after cv_received_at.
            # See backend/app/scripts/purge_expired_cv_text.py for purge utility.
            "cv_text": "TEXT",
            "cv_parsed_json": "TEXT",
            "personalized_prompt": "TEXT",
            # Boolean consent flag (SQLite stores as INTEGER 0/1). Default 0 = no consent.
            # Retained as audit trail after 90-day purge.
            "cv_consent_processing": "INTEGER DEFAULT 0 NOT NULL",
            # UTC anchor for the 90-day retention window. NULL if no CV was submitted.
            "cv_received_at": "DATETIME",
            # Transparency / explainability cluster — added by transparent-scoring-explainability
            # skill (migration 0004).
            # SHA-256 hash for EU AI Act Art. 12 / RGPD Art. 22 audit. NOT PII.
            "report_integrity_hash": "TEXT",
            # HR opt-in gate for the candidate-view endpoint. Default 0 (False).
            # Retained indefinitely as non-PII access-control flag.
            "share_with_candidate": "INTEGER DEFAULT 0 NOT NULL",
        },
    }
    # evaluationoverride is a new table — SQLModel.metadata.create_all() handles its
    # creation on fresh SQLite DBs because EvaluationOverride is registered as a
    # table=True model. No shim entry needed for new tables, only for new columns on
    # existing tables. The create_all() call in init_db() runs before _ensure_columns().
    #
    # practicession (migration 0005, candidate-practice-mode skill) follows the same
    # pattern: it is a brand-new table with no columns added to existing tables, so
    # create_all() handles it automatically. No shim entry required here.

    with engine.begin() as conn:
        for table, cols in expected.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()}
            for col, sql_type in cols.items():
                if col not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {col} {sql_type}")
                    print(f"🛠️  added column {table}.{col}")


def get_session() -> Session:
    with Session(engine) as session:
        yield session
