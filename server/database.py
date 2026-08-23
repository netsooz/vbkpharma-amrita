print("######## DATABASE FILE LOADED ########")
import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DB_PATH = Path(__file__).resolve().with_name("amrita_demo.db")
SQLITE_URL = f"sqlite:///{DB_PATH.as_posix()}"

raw_db_url = os.getenv("DATABASE_URL", "").strip()


def _resolve_database_url() -> tuple[str, bool]:
    if not raw_db_url or "var/run/postgresql" in raw_db_url or os.getenv("RENDER") == "true":
        return SQLITE_URL, True

    if raw_db_url.startswith("postgres://"):
        return raw_db_url.replace("postgres://", "postgresql+psycopg://", 1), False

    if raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
        return raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1), False

    return raw_db_url, raw_db_url.startswith("sqlite")


DATABASE_URL, is_sqlite = _resolve_database_url()

print("=== DATABASE DEBUG ===")
print("raw_db_url =", repr(raw_db_url))
print("DATABASE_URL =", repr(DATABASE_URL))
print("is_sqlite =", is_sqlite)
print("======================")


def _build_engine(db_url: str):
    return create_engine(
        db_url,
        connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {},
        pool_pre_ping=True,
    )


engine = _build_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def initialize_db() -> None:
    global DATABASE_URL, is_sqlite, engine, SessionLocal

    if not is_sqlite and os.getenv("RENDER") == "true":
        DATABASE_URL = SQLITE_URL
        is_sqlite = True
        engine = _build_engine(DATABASE_URL)
        SessionLocal.configure(bind=engine)

    if not is_sqlite:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception as exc:
            print("Database connection failed, falling back to SQLite:", exc)
            DATABASE_URL = SQLITE_URL
            is_sqlite = True
            engine = _build_engine(DATABASE_URL)
            SessionLocal.configure(bind=engine)

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()