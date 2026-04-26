import datetime
from typing import Optional
from app.models.project import Project
from app.models.account import Account
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, CHAR, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
class Comment(Base):
    __tablename__ = 'comments'
    __table_args__ = (
        ForeignKeyConstraint(['project_id'], ['projects.project_id'], name='comments_project_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['accounts.user_id'], name='comments_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'project_id', name='comments_pkey')
    )

    user_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    project_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    project: Mapped['Project'] = relationship('Project', back_populates='comments')
    user: Mapped['Account'] = relationship('Account', back_populates='comments')