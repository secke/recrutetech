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
        "interview": {"report_json": "TEXT"},
    }

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
