"""Notification persistence (Supabase-compatible schema with notification_id PK)."""

from datetime import datetime, timezone
from random import randrange
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.notifcation import Notification


def generate_notification_id(db: Session) -> str:
    for _ in range(50):
        nid = f"N{randrange(100000000, 999999999)}"
        if (
            db.query(Notification.notification_id)
            .filter(Notification.notification_id == nid)
            .first()
            is None
        ):
            return nid
    raise RuntimeError("Could not allocate notification id")


def list_notifications_for_user(
    db: Session,
    user_id: str,
    *,
    limit: int = 100,
) -> list[Notification]:
    uid = (user_id or "").strip()
    cap = min(max(limit, 1), 200)
    return (
        db.query(Notification)
        .filter(func.trim(Notification.user_id) == uid)
        .order_by(Notification.created_at.desc())
        .limit(cap)
        .all()
    )


def mark_notifications_read(
    db: Session,
    owner_user_id: str,
    notification_ids: list[str],
) -> int:
    """Set read for rows owned by owner_user_id. Returns number updated."""
    uid = (owner_user_id or "").strip()
    updated = 0
    for raw in notification_ids:
        nid = (raw or "").strip()
        if not nid:
            continue
        row = (
            db.query(Notification)
            .filter(func.trim(Notification.user_id) == uid)
            .filter(func.trim(Notification.notification_id) == nid)
            .first()
        )
        if row and not row.read:
            row.read = True
            updated += 1
    return updated


def create_chat_message_notification(
    db: Session,
    *,
    receiver_id: str,
    project_id: str,
    sender_display_name: str,
    message_preview: str,
) -> Optional[Notification]:
    """Insert a notification row for an inbound chat message. Caller commits."""
    rid = (receiver_id or "").strip()
    pid = (project_id or "").strip()
    if not rid or not pid:
        return None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    title = f"Message from {sender_display_name or 'Someone'}"[:50]
    preview = (message_preview or "").strip()
    if len(preview) > 500:
        preview = preview[:497] + "..."
    row = Notification(
        notification_id=generate_notification_id(db),
        user_id=rid,
        project_id=pid,
        notification_type="message",
        created_at=now,
        title=title,
        content=preview or None,
        read=False,
    )
    db.add(row)
    return row


def create_join_request_notification(
    db: Session,
    *,
    owner_id: str,
    project_id: str,
    project_title: str,
    applicant_display_name: str,
    application_preview: str,
) -> Optional[Notification]:
    """Notify project owner when someone applies. Caller commits."""
    oid = (owner_id or "").strip()
    pid = (project_id or "").strip()
    if not oid or not pid:
        return None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    title = f"Join request: {project_title or 'Your project'}"[:50]
    preview = (application_preview or "").strip()
    if len(preview) > 500:
        preview = preview[:497] + "..."
    body = f"{applicant_display_name or 'Someone'} applied. {preview}".strip()[:2000]
    row = Notification(
        notification_id=generate_notification_id(db),
        user_id=oid,
        project_id=pid,
        notification_type="join_request",
        created_at=now,
        title=title,
        content=body or None,
        read=False,
    )
    db.add(row)
    return row


def sender_display_name(db: Session, sender_id: str) -> str:
    uid = (sender_id or "").strip()
    acc = db.query(Account).filter(func.trim(Account.user_id) == uid).first()
    if acc and (acc.name or "").strip():
        return (acc.name or "").strip()
    return uid
