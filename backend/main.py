import app.models
from random import randrange
from fastapi import FastAPI, Depends, HTTPException, APIRouter  # type: ignore
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from app.db.base import get_db, Base, DATABASE_URL,get_db, Base, engine
from app.models.account import Account
from app.schemas.account import AccountRead, AccountCreate
from fastapi.middleware.cors import CORSMiddleware
# in another backend file
from app.db.base import USER, PASSWORD, HOST, PORT, DBNAME, DATABASE_URL

from app.routes import router
from app.models.project import Project

DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}"

app = FastAPI(title="Devsync")
app.include_router(router)
origins = [
    "http://localhost:5173",   # Vite dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # or ["*"] for quick local testing only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Devsync")

def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()

db = get_db()



@app.get("/")
async def root():
    return {"message": "Devsync in progress"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        # Just a simple query to see if the table is reachable
        user_count = db.query(Account).count()
        return {"status": "success", "accounts_in_db": user_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/tokentest")
async def token_test(token: Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}


def fake_decode_token(token: str):
    return AccountRead(name=token + "fakecoded", email="fake@email.com", grade="sophomore", roles=["admin"],
                       technologies=["mern"], skills=["sick"], user_id="numero uno")


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    user = fake_decode_token(token)
    return user

#lets test this
@app.get("/projects/{title}", response_model=pagepost)
async def get_project(title: str,db: Session = Depends(get_db)):
    post = db.query(Project).filter(Project.title == title).first()
    return post


@app.get("/users/{user_id}", response_model=AccountRead)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(Account).filter(Account.user_id == user_id).first()
    return user


@app.post("/users", response_model=AccountRead)
async def create_user(user_in: AccountCreate, db: Session = Depends(get_db)):
    existing_user = db.query(Account).filter(Account.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = Account(
        user_id=f"user{randrange(1, 10000)}",  #placeholder for user_id assignment
        name=user_in.name,
        email=user_in.email,
        grade=user_in.grade,
        roles=user_in.roles,
        technologies=user_in.technologies,
        skills=user_in.skills,
        password_hash= hash_pwd(user_in.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def hash_pwd(pwd: str):
    return password_hash.hash(pwd)

def verify_pwd(pwd: str, hashed_pw: str):
    return password_hash.verify(pwd, hashed_pw)


