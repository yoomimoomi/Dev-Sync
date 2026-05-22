import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from random import randrange
from typing import Annotated
from app.models.project import Project

import jwt
from fastapi import Depends, FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from starlette.websockets import WebSocketState
from pydantic import BaseModel
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.datetime_wire import to_iso_utc_z
from app.db.base import Base, engine, get_db
from app.models.account import Account
from app.models.application import Application
from app.models.comment import Comment
from app.routes import router
from app.schemas.account import AccountCreate, AccountRead, AccountUpdate
from app.schemas.application import ApplicationCreate, ApplicationRead, ProjectOwnerView
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.projects import ProjectCreate, ProjectRead
from app.models.notifcation import Notification
from app.schemas.message import ConversationRead, MarkThreadReadResult, MessageRead
from app.schemas.notification import NotificationRead, NotificationsMarkReadBody
from app.models.message import Message
from app.services.application_chat import (
    MAX_MESSAGE_CONTENT_LEN,
    assert_application_chat_allowed,
    generate_message_id,
    list_application_chat_messages,
    mark_thread_messages_read,
)
from app.services.notifications import (
    create_chat_message_notification,
    create_join_request_notification,
    list_notifications_for_user,
    mark_notifications_read,
    sender_display_name,
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-env")
ALGORITHM = "HS256"
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Supabase Dashboard → Settings → API → JWT Secret (read-only). Used only on the server to mint
# short-lived Realtime tokens; must NOT match JWT_SECRET_KEY.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
SUPABASE_JWT_ISS = os.getenv("SUPABASE_JWT_ISS", "").strip()
SUPABASE_REALTIME_TOKEN_MINUTES = int(os.getenv("SUPABASE_REALTIME_TOKEN_MINUTES", "55"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
password_hash = PasswordHash.recommended()
logger = logging.getLogger(__name__)


def _cors_allow_origins() -> list[str]:
    """Browser origins allowed for credentialed API calls (Vite dev default + optional LAN/extra from env)."""
    defaults = ["http://localhost:5173", "http://127.0.0.1:5173"]
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return defaults
    extra = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    seen: set[str] = set()
    out: list[str] = []
    for o in defaults + extra:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out


_CORS_ORIGINS = _cors_allow_origins()
if len(_CORS_ORIGINS) > 2:
    logger.info("CORS allow_origins extended: %s", _CORS_ORIGINS)

# Optional regex for ephemeral origins (e.g. Vercel preview deploys at
# `https://<project>-<hash>-<scope>.vercel.app`). Set CORS_ORIGIN_REGEX to a
# Python regex string in the backend env to allow them; leave empty to disable.
_CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create tables after `app` exists so import errors never hide `app` from uvicorn."""
    Base.metadata.create_all(bind=engine)
    # Do not ALTER existing tables here: on Supabase, ADD COLUMN can wait on locks and hit
    # statement_timeout, spamming logs and slowing startup. If an old DB is missing
    # notifications."read", run once in the SQL Editor — see backend/README.md.
    yield


app = FastAPI(title="Devsync", lifespan=lifespan)
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_origin_regex=_CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Token(BaseModel):
    access_token: str
    token_type: str


class RealtimeTokenOut(BaseModel):
    """JWT for Supabase Realtime only (signed with Supabase JWT secret, not the app login secret)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: str | None = None


class PasswordVerifyRequest(BaseModel):
    password: str
    hashed_password: str


async def _ws_send_json_safe(ws: WebSocket, payload: dict) -> None:
    """Send JSON only while Starlette considers the socket open; avoids uvicorn RuntimeError on dead ASGI links."""
    if ws.application_state != WebSocketState.CONNECTED:
        raise WebSocketDisconnect from None
    try:
        await ws.send_json(payload)
    except Exception:
        raise WebSocketDisconnect from None


class ChatManager:
    """In-memory registry of open WebSocket connections per user_id (multiple tabs supported)."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id not in self.active_connections:
            return
        try:
            self.active_connections[user_id].remove(websocket)
        except ValueError:
            return
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, receiver_id: str) -> bool:
        """Deliver to any registered sockets for receiver_id or its .strip() variant (CHAR padding).

        Returns True if at least one active connection received the payload (WhatsApp-style delivered).
        """
        delivered_any = False
        for rid in {receiver_id, receiver_id.strip()}:
            connections = self.active_connections.get(rid)
            if not connections:
                continue
            for connection in list(connections):
                if connection.application_state != WebSocketState.CONNECTED:
                    try:
                        await self.disconnect(rid, connection)
                    except Exception:
                        pass
                    continue
                try:
                    await connection.send_json(message)
                    delivered_any = True
                except Exception:
                    try:
                        await self.disconnect(rid, connection)
                    except Exception:
                        pass
        return delivered_any


chat_manager = ChatManager()
    
    
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
        data={"sub": user.user_id.strip()},
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
        sub_raw = payload.get("sub")
        user_id: str | None = sub_raw.strip() if isinstance(sub_raw, str) else None
        token_data = TokenData(user_id=user_id)
    except InvalidTokenError:
        raise credentials_exception

    if not token_data.user_id:
        raise credentials_exception

    user = db.query(Account).filter(func.trim(Account.user_id) == token_data.user_id).first()
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
    # exclude_unset so missing keys leave the existing value alone (true partial update).
    data = update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current_user, field, value)
    try:
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update profile")
    return current_user


@app.get("/realtime/token", response_model=RealtimeTokenOut)
async def supabase_realtime_token(current_user: Annotated[Account, Depends(get_current_user)]):
    """Return a short-lived JWT that Supabase Realtime accepts for `postgres_changes` RLS.

    Requires `SUPABASE_JWT_SECRET` in the backend environment (copy from Supabase project settings).
    This does not change Supabase's secret; it only mirrors it server-side so the browser never sees it.
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Realtime token broker is not configured (set SUPABASE_JWT_SECRET in backend/.env).",
        )
    uid = current_user.user_id.strip()
    exp_delta = timedelta(minutes=SUPABASE_REALTIME_TOKEN_MINUTES)
    expire = datetime.now(timezone.utc) + exp_delta
    payload: dict[str, object] = {
        "sub": uid,
        "role": "authenticated",
        "exp": expire,
    }
    if SUPABASE_JWT_ISS:
        payload["iss"] = SUPABASE_JWT_ISS
    raw = jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)
    token_str = raw.decode("utf-8") if isinstance(raw, bytes) else raw
    return RealtimeTokenOut(access_token=token_str, expires_in=int(exp_delta.total_seconds()))


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
        avatar=user_in.avatar,
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
            Account.avatar.label("user_avatar"),
            Application.project_id,
            Project.title.label("project_title"),
            Application.status,
            Application.role,
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
            "role": r.role,
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

    project_roles = [r.strip() for r in (project.roles or []) if r and r.strip()]
    selected_role = (application_in.role or "").strip()
    if project_roles:
        if not selected_role:
            raise HTTPException(
                status_code=400,
                detail="Please select a role offered for this project",
            )
        if selected_role not in project_roles:
            raise HTTPException(
                status_code=400,
                detail="Selected role is not offered for this project",
            )
        taken_apps = (
            db.query(Application)
            .filter(Application.project_id == application_in.project_id)
            .filter(Application.status == "Accepted")
            .all()
        )
        taken_roles = {
            (a.role or "").strip()
            for a in taken_apps
            if (a.role or "").strip()
        }
        if selected_role in taken_roles:
            raise HTTPException(
                status_code=400,
                detail="This role is no longer available for this project",
            )
    elif selected_role:
        selected_role = None

    new_application = Application(
        user_id=current_user.user_id,
        project_id=application_in.project_id,
        status="Pending",
        role=selected_role,
        content=application_in.content.strip(),
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    owner_trim = (project.user_id or "").strip()
    if not owner_trim:
        logger.warning("Join notification skipped: project %s has no owner user_id", project.project_id)
        return new_application

    owner_row = (
        db.query(Account)
        .filter(func.trim(Account.user_id) == owner_trim)
        .first()
    )
    if not owner_row:
        logger.warning(
            "Join notification skipped: no account row for owner trim=%r project=%s",
            owner_trim,
            project.project_id,
        )
        return new_application

    owner_ws_id = (owner_row.user_id or "").strip()
    project_fk_id = (project.project_id or "").strip()

    try:
        jn = create_join_request_notification(
            db,
            owner_id=owner_row.user_id,
            project_id=project_fk_id,
            project_title=project.title or "",
            applicant_display_name=(current_user.name or "").strip() or current_user.user_id.strip(),
            application_preview=new_application.content or "",
        )
        if jn is None:
            logger.warning("Join notification not created (empty ids?) project=%s", project.project_id)
        else:
            db.commit()
            db.refresh(jn)
            ca = jn.created_at
            created_str_j = to_iso_utc_z(ca) or ""
            nid = (jn.notification_id or "").strip()
            notif_app = {
                "type": "notification",
                "id": nid,
                "project_id": (jn.project_id or "").strip(),
                "title": jn.title,
                "content": jn.content,
                "read": bool(jn.read),
                "created_at": created_str_j,
            }
            await chat_manager.send_personal_message(notif_app, owner_ws_id)
    except Exception:
        logger.exception("Join request notification failed for project=%s owner=%s", project_fk_id, owner_ws_id)
        db.rollback()

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

    # If this is a reply, ensure the parent exists and lives on the same project
    # (prevents cross-project reply chains).
    if comment_in.reply_to:
        parent = (
            db.query(Comment)
            .filter(Comment.comment_id == comment_in.reply_to)
            .first()
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if (parent.project_id or "").strip() != (comment_in.project_id or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Cannot reply to a comment from a different project",
            )

    new_comment = Comment(
        comment_id=f"C{randrange(100000000, 999999999)}",
        user_id=current_user.user_id,
        project_id=comment_in.project_id,
        content=comment_in.content.strip(),
        reply_to=comment_in.reply_to,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return (
        db.query(Comment)
        .filter(Comment.comment_id == new_comment.comment_id)
        .options(selectinload(Comment.user))
        .first()
    )


def _http_exception_detail(exc: HTTPException) -> str:
    if isinstance(exc.detail, str):
        return exc.detail
    return str(exc.detail)


@app.get("/messages/application/{project_id}/{peer_user_id}", response_model=list[MessageRead])
async def get_application_chat_messages(
    project_id: str,
    peer_user_id: str,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
    limit: int = 200,
):
    """Applicant ↔ owner DM history for a project (both participants must be allowed)."""
    rows = list_application_chat_messages(
        db,
        project_id,
        current_user.user_id,
        peer_user_id,
        limit=limit,
    )
    return rows


@app.get("/messages/conversations", response_model=list[ConversationRead])
async def get_my_conversations(
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all distinct conversation threads for the current user, newest first."""
    uid = current_user.user_id.strip()

    msgs = (
        db.query(Message)
        .filter(
            (func.trim(Message.sender_id) == uid)
            | (func.trim(Message.receiver_id) == uid)
        )
        .order_by(Message.created_at.desc())
        .all()
    )

    # Deduplicate: keep only the most recent message per (project_id, peer_id) pair
    seen: dict[tuple[str, str], Message] = {}
    for msg in msgs:
        s = (msg.sender_id or "").strip()
        r = (msg.receiver_id or "").strip()
        p = (msg.project_id or "").strip()
        peer_id = r if s == uid else s
        key = (p, peer_id)
        if key not in seen:
            seen[key] = msg

    result: list[ConversationRead] = []
    for (pid, peer_id), msg in seen.items():
        peer = db.query(Account).filter(func.trim(Account.user_id) == peer_id).first()
        project = (
            db.query(Project)
            .filter(func.trim(Project.project_id) == pid)
            .filter(Project.is_deleted.is_(False))
            .first()
        )
        if not peer or not project:
            continue
        result.append(
            ConversationRead(
                project_id=pid,
                project_title=project.title or "",
                peer_user_id=peer_id,
                peer_name=peer.name or "",
                peer_avatar=peer.avatar,
                last_message=msg.content,
                last_message_at=msg.created_at,
            )
        )

    return result


@app.post(
    "/messages/application/{project_id}/{peer_user_id}/read",
    response_model=MarkThreadReadResult,
)
async def mark_application_thread_read(
    project_id: str,
    peer_user_id: str,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Mark all inbound messages in this thread as read (current user is receiver)."""
    try:
        ids = mark_thread_messages_read(
            db,
            project_id,
            current_user.user_id,
            peer_user_id,
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update read state")
    return MarkThreadReadResult(updated_message_ids=ids)


def _notification_to_read(n: Notification) -> NotificationRead:
    pid = (n.project_id or "").strip()
    ca = n.created_at
    return NotificationRead(
        id=(n.notification_id or "").strip(),
        project_id=pid,
        title=n.title,
        content=n.content,
        read=bool(n.read),
        created_at=ca,
    )


@app.get("/notifications", response_model=list[NotificationRead])
async def get_my_notifications(
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
    limit: int = 100,
):
    rows = list_notifications_for_user(db, current_user.user_id, limit=limit)
    return [_notification_to_read(r) for r in rows]


@app.patch("/notifications/read", response_model=dict)
async def patch_notifications_read(
    body: NotificationsMarkReadBody,
    current_user: Annotated[Account, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        n = mark_notifications_read(db, current_user.user_id, body.ids)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update notifications")
    return {"updated": n}


# WebSocket protocol:
# Client → server (send DM): JSON { "project_id", "receiver_id", "content" } (no "type"; sender = JWT sub).
# Client → server (read receipts): JSON { "type": "mark_read", "project_id", "peer_user_id" }.
# Server → client: { "type": "application_message", "message_id", "project_id", "sender_id",
#   "receiver_id", "content", "is_read", "created_at" } to recipient and sender (ack echo).
# Server → client (sender only, after a send): { "type": "message_receipt", "message_id", "project_id",
#   "peer_user_id", "delivered", "read" } — delivered=true if peer had an active WS (like a grey tick); read from DB.
# Server → client: { "type": "read_receipt", "project_id", "peer_user_id", "message_ids", "read": true }.
# Server → client: { "type": "notification", "id", "project_id", "title", "content", "read", "created_at" }.
# Errors: { "type": "error", "detail": "..." }.


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    # If decode fails we close before accept(); Uvicorn logs that as HTTP 403 on the upgrade request.
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = jwt_payload.get("sub")
    except ExpiredSignatureError:
        logger.warning("WebSocket /ws/chat rejected: access token expired (log in again)")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    except InvalidTokenError as exc:
        logger.warning(
            "WebSocket /ws/chat rejected: invalid token (%s). "
            "Check JWT_SECRET_KEY matches the server that issued the token, or clear stale localStorage and re-login.",
            exc,
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    except Exception as exc:
        logger.warning("WebSocket /ws/chat rejected: token decode error (%s)", exc)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    if not isinstance(sub, str) or not sub.strip():
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = sub.strip()
    await chat_manager.connect(user_id, websocket)
    try:
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except json.JSONDecodeError:
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "Invalid JSON"})
                continue
            except Exception:
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "Invalid message payload"})
                continue

            if not isinstance(data, dict):
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "Message must be a JSON object"})
                continue

            if data.get("type") == "mark_read":
                pid_raw = data.get("project_id")
                peer_raw = data.get("peer_user_id")
                if not isinstance(pid_raw, str) or not isinstance(peer_raw, str):
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "detail": "project_id and peer_user_id must be strings"},
                    )
                    continue
                pid = pid_raw.strip()
                peer = peer_raw.strip()
                try:
                    updated_ids = mark_thread_messages_read(db, pid, user_id, peer)
                    db.commit()
                except HTTPException as exc:
                    db.rollback()
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "detail": _http_exception_detail(exc)},
                    )
                    continue
                except Exception:
                    db.rollback()
                    await _ws_send_json_safe(
                        websocket,
                        {"type": "error", "detail": "Could not update read state"},
                    )
                    continue

                receipt = {
                    "type": "read_receipt",
                    "project_id": pid,
                    "peer_user_id": peer,
                    "message_ids": updated_ids,
                    "read": True,
                }
                await chat_manager.send_personal_message(receipt, user_id)
                await chat_manager.send_personal_message(receipt, peer)
                continue

            project_id = data.get("project_id")
            receiver_id = data.get("receiver_id")
            content_raw = data.get("content")

            if not isinstance(project_id, str) or not isinstance(receiver_id, str):
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "detail": "project_id and receiver_id must be strings"},
                )
                continue
            project_id = project_id.strip()
            receiver_id = receiver_id.strip()
            if not isinstance(content_raw, str):
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "content must be a string"})
                continue

            text = content_raw.strip()
            if not text:
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "content cannot be empty"})
                continue
            if len(text) > MAX_MESSAGE_CONTENT_LEN:
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "detail": f"content exceeds {MAX_MESSAGE_CONTENT_LEN} characters"},
                )
                continue

            try:
                assert_application_chat_allowed(db, project_id, user_id, receiver_id)
            except HTTPException as exc:
                await _ws_send_json_safe(
                    websocket,
                    {"type": "error", "detail": _http_exception_detail(exc)},
                )
                continue

            new_msg = Message(
                message_id=generate_message_id(db),
                project_id=project_id,
                sender_id=user_id,
                receiver_id=receiver_id,
                content=text,
            )
            db.add(new_msg)
            try:
                db.commit()
                db.refresh(new_msg)
            except Exception:
                db.rollback()
                await _ws_send_json_safe(websocket, {"type": "error", "detail": "Could not save message"})
                continue

            created_at = new_msg.created_at
            created_str = to_iso_utc_z(created_at) or ""

            outbound = {
                "type": "application_message",
                "message_id": new_msg.message_id,
                "project_id": new_msg.project_id,
                "sender_id": new_msg.sender_id,
                "receiver_id": new_msg.receiver_id,
                "content": new_msg.content,
                "is_read": new_msg.is_read,
                "created_at": created_str,
            }
            # Echo to sender first so their UI updates before the peer (lower perceived latency).
            await chat_manager.send_personal_message(outbound, user_id)
            peer_online = await chat_manager.send_personal_message(outbound, receiver_id)
            await chat_manager.send_personal_message(
                {
                    "type": "message_receipt",
                    "message_id": (new_msg.message_id or "").strip(),
                    "project_id": project_id,
                    "peer_user_id": receiver_id,
                    "delivered": peer_online,
                    "read": bool(new_msg.is_read),
                },
                user_id,
            )

            try:
                sname = sender_display_name(db, user_id)
                n = create_chat_message_notification(
                    db,
                    receiver_id=receiver_id,
                    project_id=project_id,
                    sender_display_name=sname,
                    message_preview=text,
                )
                if n is not None:
                    db.commit()
                    db.refresh(n)
                    ca = n.created_at
                    created_str_n = to_iso_utc_z(ca) or ""
                    nid = (n.notification_id or "").strip()
                    notif_out = {
                        "type": "notification",
                        "id": nid,
                        "project_id": (n.project_id or "").strip(),
                        "title": n.title,
                        "content": n.content,
                        "read": bool(n.read),
                        "created_at": created_str_n,
                    }
                    await chat_manager.send_personal_message(notif_out, receiver_id)
            except Exception:
                db.rollback()

    except WebSocketDisconnect:
        await chat_manager.disconnect(user_id, websocket)
