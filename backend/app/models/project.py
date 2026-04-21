import datetime
from typing import Optional

from sqlalchemy import String, ForeignKeyConstraint, PrimaryKeyConstraint, Text, DateTime, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
class Project(Base):
    __tablename__ = 'projects'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['accounts.user_id'], name='projects_user_id_fkey'),
        PrimaryKeyConstraint('project_id', name='projects_pkey')
    )

    project_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(10))
    title: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(String(6))
    grade: Mapped[Optional[str]] = mapped_column(String(10))
    roles: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    skills: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    technologies: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    owner: Mapped[Optional['Account']] = relationship('Account', back_populates='projects')
    applications: Mapped[list['Application']] = relationship('Application', back_populates='project')
    comments: Mapped[list['Comment']] = relationship('Comment', back_populates='project')