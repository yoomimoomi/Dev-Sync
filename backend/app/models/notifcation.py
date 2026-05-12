import datetime
from typing import Optional

from sqlalchemy import Text, String, ForeignKey, text, CHAR, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(CHAR(10), ForeignKey("accounts.user_id"))
    project_id: Mapped[Optional[str]] = mapped_column(CHAR(10), ForeignKey("projects.project_id"))
    notification_type: Mapped[Optional[str]] = mapped_column("type", String(15))
    title: Mapped[Optional[str]] = mapped_column(String(50))
    content: Mapped[Optional[str]] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(
        "read", Boolean, server_default=text("FALSE"), nullable=False
    )
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP")
    )
