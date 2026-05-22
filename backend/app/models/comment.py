import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    CHAR,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.project import Project


class Comment(Base):
    __tablename__ = 'comments'
    __table_args__ = (
        ForeignKeyConstraint(['project_id'], ['projects.project_id'], name='comments_project_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['accounts.user_id'], name='comments_user_id_fkey'),
    )

    # Surrogate PK so users can post multiple comments per project and replies
    # can target a specific comment. The physical column in Postgres is the
    # mixed-case "Id" (case-sensitive), so we map it explicitly while keeping
    # `comment_id` as the Python/API attribute name — the rest of the codebase
    # (schemas, routes, frontend) talks about `comment_id`.
    comment_id: Mapped[str] = mapped_column("Id", CHAR(10), primary_key=True)
    user_id: Mapped[str] = mapped_column(CHAR(10))
    project_id: Mapped[str] = mapped_column(CHAR(10))
    content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    # NULL for top-level comments. SET NULL on parent delete keeps replies alive
    # instead of cascading them. References the "Id" column above.
    reply_to: Mapped[Optional[str]] = mapped_column(
        CHAR(10),
        ForeignKey('comments.Id', ondelete='SET NULL', name='comments_reply_to_fkey'),
        nullable=True,
        default=None,
    )

    project: Mapped['Project'] = relationship('Project', back_populates='comments')
    user: Mapped['Account'] = relationship('Account', back_populates='comments')
