import os
from datetime import datetime, timedelta, timezone
from random import randrange
from typing import Annotated
from app.models.project import Project

import jwt
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.orm import Session, selectinload

from app.db.base import Base, engine, get_db
from app.models.account import Account
from app.models.application import Application
from app.models.comment import Comment
from app.routes import router
from app.supabase_bucket_storage import upload_avatar
from app.schemas.account import AccountCreate, AccountRead, AccountUpdate
from app.schemas.application import ApplicationCreate, ApplicationRead, ProjectOwnerView
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.projects import ProjectCreate, ProjectRead


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


_AVATAR_MAX_BYTES = 5 * 1024 * 1024
_AVATAR_ALLOWED_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/gif"})


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


@app.patch("/user/me", response_model=AccountRead)
async def update_me(
    update: AccountUpdate,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if update.name is not None:
        current_user.name = update.name
    if update.email is not None:
        conflict = (
            db.query(Account)
            .filter(Account.email == update.email, Account.user_id != current_user.user_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update.email
    if "grade" in update.model_fields_set:
        current_user.grade = update.grade
    if "bio" in update.model_fields_set:
        current_user.bio = update.bio
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/user/me/avatar")
async def upload_my_avatar(
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    if not file.content_type or file.content_type not in _AVATAR_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpeg, png, webp, or gif)",
        )
    data = await file.read()
    if len(data) > _AVATAR_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")
    try:
        avatar_path = upload_avatar(
            current_user.user_id,
            data,
            file.content_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    current_user.avatar_path = avatar_path
    db.commit()
    db.refresh(current_user)
    return avatar_path


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


@app.get("/projects", response_model=list[ProjectRead])
async def get_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(Project.is_deleted == False)
        .options(
            selectinload(Project.owner),
            selectinload(Project.applications).selectinload(Application.user),
            selectinload(Project.comments).selectinload(Comment.user),
        )
        .all()
    )
    return projects


@app.get("/projects/me", response_model=list[ProjectRead])
async def get_my_projects(
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.user_id)
        .filter(Project.is_deleted == False)
        .options(
            selectinload(Project.owner),
            selectinload(Project.applications).selectinload(Application.user),
            selectinload(Project.comments).selectinload(Comment.user),
        )
        .all()
    )
    return projects


@app.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project_by_id(project_id: str, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter(Project.project_id == project_id)
        .filter(Project.is_deleted == False)
        .options(
            selectinload(Project.owner),
            selectinload(Project.applications).selectinload(Application.user),
            selectinload(Project.comments).selectinload(Comment.user),
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/projects/user/{user_id}", response_model=list[ProjectRead])
async def get_projects_by_user_id(user_id: str, db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
    .filter(Project.user_id == user_id)
    .filter(Project.is_deleted == False)
    .options(
        selectinload(Project.owner),
        selectinload(Project.applications).selectinload(Application.user),
        selectinload(Project.comments).selectinload(Comment.user),
    )
    .all()
    )
    return projects


@app.post("/project", response_model=ProjectRead)
async def create_project(project_in: ProjectCreate, current_user: Annotated[Account, Depends(get_current_user)], db: Session = Depends(get_db)):
    new_project = Project(
        project_id=f"P{randrange(100000000, 999999999)}",
        user_id=current_user.user_id,
        title=project_in.title,
        description=project_in.description,
        grade=project_in.grade,
        roles=project_in.roles,
        skills=project_in.skills,
        technologies=project_in.technologies,
        status="Open",
    )
    db.add(new_project)
    db.commit()
    
    db.refresh(new_project)
    return new_project


@app.patch("/project/{project_id}", status_code=204)
async def delete_project(project_id: str, current_user: Annotated[Account, Depends(get_current_user)], db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You are not the owner of this project")
    project.is_deleted = True
    db.commit()
    db.refresh(project)


@app.get("/applications/my-projects", response_model=list[ProjectOwnerView])
async def get_applications_to_my_projects(
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Application.user_id,
            Account.name.label("user_name"),
            Account.avatar_path.label("user_avatar"),
            Application.project_id,
            Project.title.label("project_title"),
            Application.status,
            Application.created_at,
        )
        .join(Account, Account.user_id == Application.user_id)
        .join(Project, Project.project_id == Application.project_id)
        .filter(Project.user_id == current_user.user_id)
        .filter(Project.is_deleted == False)
        .filter(Application.status == "Pending")
        .order_by(Application.created_at.desc())
        .all()
    )
    return [
        {
            "user_id": r.user_id,
            "user_name": r.user_name,
            "user_avatar": r.user_avatar,
            "project_id": r.project_id,
            "project_title": r.project_title,
            "status": r.status,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@app.get("/applications/user/{user_id}", response_model=list[ApplicationRead])
async def get_applications_by_user_id(user_id: str, db: Session = Depends(get_db)):
    applications = (
        db.query(Application)
        .join(Project, Project.project_id == Application.project_id)
        .filter(Application.user_id == user_id)
        .filter(Project.is_deleted == False)
        .all()
    )
    return applications


@app.patch("/applications/{project_id}/{user_id}/accept", response_model=ApplicationRead)
async def accept_application(
    project_id: str,
    user_id: str,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .filter(Project.project_id == project_id)
        .filter(Project.is_deleted == False)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not allowed to manage this project")

    application = (
        db.query(Application)
        .filter(
            Application.project_id == project_id,
            Application.user_id == user_id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = "Accepted"
    db.commit()
    db.refresh(application)
    return application


@app.patch("/applications/{project_id}/{user_id}/decline", response_model=ApplicationRead)
async def decline_application(
    project_id: str,
    user_id: str,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .filter(Project.project_id == project_id)
        .filter(Project.is_deleted == False)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not allowed to manage this project")

    application = (
        db.query(Application)
        .filter(
            Application.project_id == project_id,
            Application.user_id == user_id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = "Declined"
    db.commit()
    db.refresh(application)
    return application


@app.post("/application", response_model=ApplicationRead)
async def create_application(
    application_in: ApplicationCreate,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if application_in.user_id and application_in.user_id != current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="Submitted user_id does not match authenticated user",
        )

    if application_in.status and application_in.status.lower() != "pending":
        raise HTTPException(
            status_code=400,
            detail="Initial application status must be Pending",
        )

    project = (
        db.query(Project)
        .filter(Project.project_id == application_in.project_id)
        .filter(Project.is_deleted == False)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot apply to your own project",
        )

    existing = (
        db.query(Application)
        .filter(
            Application.user_id == current_user.user_id,
            Application.project_id == application_in.project_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an application for this project",
        )

    new_application = Application(
        user_id=current_user.user_id,
        project_id=application_in.project_id,
        status="Pending",
        content=application_in.content.strip(),
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    return new_application


@app.post("/comment", response_model=CommentRead)
async def create_comment(
    comment_in: CommentCreate,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .filter(Project.project_id == comment_in.project_id)
        .filter(Project.is_deleted == False)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing_comment = (
        db.query(Comment)
        .filter(
            Comment.user_id == current_user.user_id,
            Comment.project_id == comment_in.project_id,
        )
        .first()
    )
    if existing_comment:
        raise HTTPException(
            status_code=400,
            detail="You have already posted a comment on this project",
        )

    new_comment = Comment(
        user_id=current_user.user_id,
        project_id=comment_in.project_id,
        content=comment_in.content.strip(),
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return (
        db.query(Comment)
        .filter(
            Comment.user_id == new_comment.user_id,
            Comment.project_id == new_comment.project_id,
        )
        .options(selectinload(Comment.user))
        .first()
    )