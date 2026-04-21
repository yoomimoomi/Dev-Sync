import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
DATABASE_URL = 'postgresql+psycopg2://postgres@localhost:5432/test'
print(os.environ.get('DATABASE_URL'))
engine = create_engine(DATABASE_URL,echo=True) #just a test database, please manually configure
SessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()