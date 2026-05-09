"""Alembic environment configuration for RecruteTech.

Design decisions:
- DATABASE_URL is read from app.core.config.settings so we never hard-code
  credentials or connection strings in migration code.
- SQLModel.metadata is imported after importing app.models so that all table
  definitions are registered before autogenerate inspects the metadata.
- Offline mode uses a literal URL from settings; online mode re-uses the same
  SQLAlchemy engine pattern as db.py (SQLite check_same_thread=False for dev).
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy import create_engine

from alembic import context

# ---------------------------------------------------------------------------
# Load app configuration — DATABASE_URL comes from settings, never hard-coded.
# ---------------------------------------------------------------------------
from app.core.config import settings

# ---------------------------------------------------------------------------
# Import all models so that SQLModel registers them with its shared metadata
# before autogenerate introspects the schema.
# ---------------------------------------------------------------------------
import app.models  # noqa: F401 — side-effect import to populate SQLModel.metadata
from sqlmodel import SQLModel

# ---------------------------------------------------------------------------
# Alembic Config object — gives access to values in alembic.ini.
# ---------------------------------------------------------------------------
config = context.config

# Override the sqlalchemy.url with the value from settings so alembic.ini
# does not need (and should not contain) a real database URL.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use SQLModel's shared metadata for autogenerate support.
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout / file).

    No database connection is required; useful for generating SQL scripts.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # required for SQLite ALTER TABLE support
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to the DB directly)."""
    url = settings.DATABASE_URL
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}

    connectable = create_engine(url, connect_args=connect_args, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # required for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
