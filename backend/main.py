import app.models
from random import randrange
from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from app.db.base import get_db, Base, engine
from app.models.account import Account
from app.schemas.account import AccountRead, AccountCreate

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Devsync")
password_hash = PasswordHash.recommended()

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


@app.get("/user/me")
async def get_user(current_user: Annotated[AccountRead, Depends(get_current_user)]):
    return current_user


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