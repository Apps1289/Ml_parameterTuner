import logging
from typing import Generator, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import OperationalError

from config import DATABASE_URL, SUPABASE_URL, SUPABASE_KEY, SQLALCHEMY_ECHO

logger = logging.getLogger(__name__)

try:
    from supabase import create_client as create_supabase_client
except Exception:
    create_supabase_client = None

SQLALCHEMY_DATABASE_URL = DATABASE_URL
SQLITE_FALLBACK_URL = "sqlite:///./local_auth.db"

engine = None
SessionLocal = None
_using_fallback = False


def _create_session_factory(db_url: str):
    # SQLite requires check_same_thread=False; PostgreSQL needs none.
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    e = create_engine(db_url, echo=SQLALCHEMY_ECHO, future=True, connect_args=connect_args)
    return e, sessionmaker(bind=e, autoflush=False, autocommit=False, future=True)


if SQLALCHEMY_DATABASE_URL:
    try:
        engine, SessionLocal = _create_session_factory(SQLALCHEMY_DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to primary database.")
    except Exception as exc:
        logger.warning(
            "Could not connect to DATABASE_URL. Falling back to SQLite. Error: %s", exc
        )
        engine, SessionLocal = _create_session_factory(SQLITE_FALLBACK_URL)
        _using_fallback = True
else:
    logger.info("No DATABASE_URL set — using SQLite fallback.")
    engine, SessionLocal = _create_session_factory(SQLITE_FALLBACK_URL)
    _using_fallback = True

# Optional Supabase client (not required for basic DB usage)
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY and create_supabase_client:
    try:
        supabase_client = create_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as exc:
        logger.warning("Could not initialise Supabase client: %s", exc)


def get_db() -> Generator[Optional[Session], None, None]:
    """Yield a SQLAlchemy session, or None if no DB configured."""
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create database tables. Safe to call at startup."""
    if engine is None:
        return
    try:
        from models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialised (fallback=%s).", _using_fallback)
    except OperationalError as exc:
        logger.error("init_db failed: %s", exc)
