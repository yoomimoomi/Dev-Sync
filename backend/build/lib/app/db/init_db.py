# Create this as a temporary script: backend/init_db.py
from app.db.base import Base, engine
from app.models.account import Account  # Must be imported to register with Base

def init_db():
    print("Creating database tables...")
    # This is the line that actually creates the .sqlite3 file
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    init_db()