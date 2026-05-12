import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

#Override default Windows environment variables
_backend_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_backend_root / ".env", override=True)


USER = os.getenv("user") or os.getenv("USER")
PASSWORD = os.getenv("password") or os.getenv("PASSWORD")
HOST = os.getenv("host") or os.getenv("HOST")
PORT = os.getenv("port") or os.getenv("PORT")
DBNAME = os.getenv("dbname") or os.getenv("DBNAME")

if HOST and "pooler.supabase.com" in HOST and USER == "postgres":
    raise RuntimeError(
        "For host *.pooler.supabase.com, set user to postgres.<your-project-ref> "
        "(Supabase Dashboard → Connect → Session), not plain postgres."
    )

_user = quote_plus(USER or "")
_pass = quote_plus(PASSWORD or "")
DATABASE_URL = (
    f"postgresql+psycopg2://{_user}:{_pass}@{HOST}:{PORT}/{DBNAME}?sslmode=require"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
