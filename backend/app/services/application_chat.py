"""Applicant ↔ project-owner DM rules and queries (scoped by project_id)."""

from random import randrange

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.message import Message
from app.models.project import Project

MAX_MESSAGE_CONTENT_LEN = 8000
HISTORY_DEFAULT_LIMIT = 200


def _norm_uid(value: str | None) -> str:
    """Strip Postgres CHAR padding / stray whitespace so JWT and DB ids match."""
    return (value or "").strip()


def generate_message_id(db: Session) -> str:
    for _ in range(50):
        mid = f"M{randrange(100000000, 999999999)}"
        if db.query(Message.message_id).filter(Message.message_id == mid).first() is None:
            return mid
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not allocate message id",
    )


def assert_application_chat_allowed(
    db: Session,
    project_id: str,
    user_id: str,
    peer_user_id: str,
) -> None:
    """Raise HTTPException if this pair may not use applicant-owner chat for project_id."""
    uid = _norm_uid(user_id)
    peer = _norm_uid(peer_user_id)
    pid = _norm_uid(project_id)

    if not pid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if uid == peer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid message participants",
        )
    project = (
        db.query(Project)
        .filter(func.trim(Project.project_id) == pid)
        .filter(Project.is_deleted.is_(False))
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    owner_id = _norm_uid(project.user_id)
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project has no owner",
        )

    if owner_id != uid and owner_id != peer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation",
        )

    applicant_id = uid if uid != owner_id else peer
    app = (
        db.query(Application)
        .filter(func.trim(Application.project_id) == pid)
        .filter(func.trim(Application.user_id) == applicant_id)
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No application exists for this conversation",
        )


def mark_thread_messages_read(
    db: Session,
    project_id: str,
    reader_user_id: str,
    peer_user_id: str,
) -> list[str]:
    """Mark inbound messages in this thread as read (receiver == reader, sender == peer). Returns message_ids updated."""
    assert_application_chat_allowed(db, project_id, reader_user_id, peer_user_id)
    uid = _norm_uid(reader_user_id)
    peer = _norm_uid(peer_user_id)
    pid = _norm_uid(project_id)
    rows = (
        db.query(Message)
        .filter(func.trim(Message.project_id) == pid)
        .filter(func.trim(Message.receiver_id) == uid)
        .filter(func.trim(Message.sender_id) == peer)
        .filter((Message.is_read.is_(False)) | (Message.is_read.is_(None)))
        .all()
    )
    ids: list[str] = []
    for m in rows:
        m.is_read = True
        ids.append((m.message_id or "").strip())
    return ids


def list_application_chat_messages(
    db: Session,
    project_id: str,
    user_id: str,
    peer_user_id: str,
    *,
    limit: int = HISTORY_DEFAULT_LIMIT,
) -> list[Message]:
    cap = min(max(limit, 1), HISTORY_DEFAULT_LIMIT)
    assert_application_chat_allowed(db, project_id, user_id, peer_user_id)
    uid = _norm_uid(user_id)
    peer = _norm_uid(peer_user_id)
    pid = _norm_uid(project_id)
    return (
        db.query(Message)
        .filter(func.trim(Message.project_id) == pid)
        .filter(
            (
                (func.trim(Message.sender_id) == uid)
                & (func.trim(Message.receiver_id) == peer)
            )
            | (
                (func.trim(Message.sender_id) == peer)
                & (func.trim(Message.receiver_id) == uid)
            )
        )
        .order_by(Message.created_at.asc())
        .limit(cap)
        .all()
    )
