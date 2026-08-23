import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "").strip()

# Resilient connection string resolver
if not raw_db_url or "var/run/postgresql" in raw_db_url:
    # Safe fallback to SQLite for instant online demo if Postgres URL isn't configured
    DATABASE_URL = "sqlite:///./amrita_demo.db"
elif raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
    DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = raw_db_url

is_sqlite = DATABASE_URL.startswith("sqlite")

print("=== DATABASE DEBUG ===")
print("raw_db_url =", repr(raw_db_url))
print("DATABASE_URL =", repr(DATABASE_URL))
print("is_sqlite =", is_sqlite)
print("======================")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()