import datetime
from typing import Optional
from app.models.project import Project
from app.models.account import Account
from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, CHAR, String, DateTime, text, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.db.base import Base


class Application(Base):
    __tablename__ = 'applications'
    __table_args__ = (
        ForeignKeyConstraint(['project_id'], ['projects.project_id'], name='application_project_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['accounts.user_id'], name='application_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'project_id', name='application_pkey')
    )

    user_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    project_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    status: Mapped[Optional[str]] = mapped_column(String(8))
    content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    project: Mapped['Project'] = relationship('Project', back_populates='applications')
    user: Mapped['Account'] = relationship('Account', back_populates='applications')