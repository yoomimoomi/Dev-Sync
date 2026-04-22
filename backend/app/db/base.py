import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db.sqlite3"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL,connect_args=connect_args,echo=True)
SessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


