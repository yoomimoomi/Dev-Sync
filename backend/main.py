from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import get_db, Base
from app.models.account import Account
from app.schemas.account import AccountBase
from app.schemas.grade import Grade

engine = create_engine("sqlite://")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

Base.metadata.create_all(bind=engine)
app = FastAPI(title = "Devsync")
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
async def token_test(token : Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}

def fake_decode_token(token: str):
    return AccountBase(username = token + "fakecoded", email = "fake@email.com", grade = Grade.JUNIOR, firstname= "Kevon", lastname= "Franklyn", roles= "admin", technologies= "mern", skills= "sick", user_id= "numero uno")

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    user = fake_decode_token(token)
    return user
@app.get("/user/me")
async def get_user(current_user: Annotated[AccountBase,Depends(get_current_user)]):
    return current_user
@app.post("/users")
async def create_user(user: AccountBase):
    return user
