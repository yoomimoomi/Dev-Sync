import os
from datetime import datetime, timedelta, timezone
from random import randrange
from typing import Annotated

import app.models
import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.orm import Session

from app.db.base import Base, engine, get_db
from app.models.account import Account
from app.routes import router
from app.schemas.account import AccountCreate, AccountRead


ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-env")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
password_hash = PasswordHash.recommended()

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Devsync")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str | None = None


class PasswordVerifyRequest(BaseModel):
    password: str
    hashed_password: str


@app.get("/")
async def root():
    return {"message": "Devsync in progress"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        user_count = db.query(Account).count()
        return {"status": "success", "accounts_in_db": user_count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
async def health_check():
    return {"status": "ok"}


def hash_pwd(pwd: str) -> str:
    return password_hash.hash(pwd)


def verify_pwd(pwd: str, hashed_pw: str | None) -> bool:
    if not hashed_pw:
        return False
    try:
        return password_hash.verify(pwd, hashed_pw)
    except UnknownHashError:
        return False


def authenticate_user(db: Session, email: str, password: str) -> Account | None:
    user = db.query(Account).filter(Account.email == email).first()
    if not user or not verify_pwd(password, user.password_hash):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm uses "username"; we treat it as the login email.
    user = authenticate_user(db=db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> Account:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        token_data = TokenData(user_id=user_id)
    except InvalidTokenError:
        raise credentials_exception

    if not token_data.user_id:
        raise credentials_exception

    user = db.query(Account).filter(Account.user_id == token_data.user_id).first()
    if not user:
        raise credentials_exception

    return user


@app.get("/user/me", response_model=AccountRead)
async def get_me(current_user: Annotated[Account, Depends(get_current_user)]):
    return current_user


@app.get("/auth/test-jwt")
async def test_jwt_auth(current_user: Annotated[Account, Depends(get_current_user)]):
    return {
        "message": "JWT auth is working",
        "user_id": current_user.user_id,
        "email": current_user.email,
    }


@app.post("/auth/test-password")
async def test_password_verification(payload: PasswordVerifyRequest):
    return {"valid": verify_pwd(payload.password, payload.hashed_password)}


@app.get("/users/{user_id}", response_model=AccountRead)
async def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = db.query(Account).filter(Account.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/users", response_model=AccountRead)
async def create_user(user_in: AccountCreate, db: Session = Depends(get_db)):
    existing_user = db.query(Account).filter(Account.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = Account(
        user_id=f"user{randrange(1, 10000)}",
        name=user_in.name,
        email=user_in.email,
        grade=user_in.grade,
        roles=user_in.roles,
        technologies=user_in.technologies,
        skills=user_in.skills,
        password_hash=hash_pwd(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


