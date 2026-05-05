from sqlmodel import create_engine, Session
import os
import logging
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

logger = logging.getLogger("liner-backend.db")


def _should_run_migrations_on_startup() -> bool:
    configured = os.getenv("RUN_MIGRATIONS_ON_STARTUP")
    if configured is not None:
        return configured.strip() not in ("", "0", "false", "False")
    # In local SQLite dev, auto-running Alembic on every reload is fragile and can break requests.
    return not DATABASE_URL.startswith("sqlite")


def init_db():
    # Optionally run Alembic migrations on startup to keep schema in sync
    if _should_run_migrations_on_startup():
        try:
            from alembic.config import Config
            from alembic import command
            base_dir = os.path.dirname(os.path.dirname(__file__))  # backend/
            alembic_ini = os.path.join(base_dir, "alembic.ini")
            cfg = Config(alembic_ini)
            cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
            command.upgrade(cfg, "head")
            logger.info("Alembic migrations applied at startup")
        except Exception as e:
            logger.warning("Skipping migrations at startup: %s", e)
    else:
        logger.info("Skipping migrations at startup by configuration")
    # If disabled, rely on external alembic upgrade

def get_session():
    # Avoid expiring objects on commit to reduce refresh round-trips
    with Session(engine, expire_on_commit=False) as session:
        yield session

# For SQLite foreign key enforcement
@event.listens_for(Engine, "connect")
def set_sqlite_fk_pragma(dbapi_connection, _):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cur = dbapi_connection.cursor()
        # Enforce FK and apply performance-oriented PRAGMAs for SQLite
        cur.execute("PRAGMA foreign_keys=ON")
        try:
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA synchronous=NORMAL")
            cur.execute("PRAGMA temp_store=MEMORY")
            # Negative cache_size means KB; -20000 ~= ~20MB cache
            cur.execute("PRAGMA cache_size=-20000")
        finally:
            cur.close()
