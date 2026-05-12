import datetime
from typing import Optional

from sqlalchemy import Text, String, ForeignKey, text, CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class Notification(Base):
    __tablename__ = 'notifications'

    user_id: Mapped[str] = mapped_column(CHAR(10), ForeignKey('accounts.user_id'), primary_key=True)
    project_id: Mapped[str] = mapped_column(CHAR(10), ForeignKey('projects.project_id'), primary_key=True)
    created_at: Mapped[datetime.datetime] = mapped_column(primary_key=True, server_default=text('CURRENT_TIMESTAMP'))

    title: Mapped[Optional[str]] = mapped_column(String(50))
    content: Mapped[Optional[str]] = mapped_column(Text)