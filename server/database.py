import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Modern psycopg v3 driver format: postgresql+psycopg://
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://postgres:postgres@localhost:5432/amrita_pharma_mes"
)

# SQLite fallback for instant local testing without needing PostgreSQL installed yet
if not os.getenv("DATABASE_URL"):
    # If no custom DB URL is provided and PostgreSQL isn't running, you can use SQLite for instant demo:
    DATABASE_URL = "sqlite:///./amrita_demo.db"

is_sqlite = DATABASE_URL.startswith("sqlite")

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