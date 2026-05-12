from typing import Optional, TYPE_CHECKING
from datetime import datetime

from sqlalchemy import String, PrimaryKeyConstraint, UniqueConstraint, CHAR, DateTime, Text, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.application import Application
    from app.models.comment import Comment

from app.models.message import Message


class Account(Base):
    __tablename__ = 'accounts'
    __table_args__ = (
        PrimaryKeyConstraint('user_id', name='accounts_pkey'),
        UniqueConstraint('email', name='accounts_email_key')
    )#Keys/Constraints from the Postgresql schema

    user_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text())
    name: Mapped[Optional[str]] = mapped_column(String(50))#Should be changed to non-null
    email: Mapped[Optional[str]] = mapped_column(String(50))
    grade: Mapped[Optional[str]] = mapped_column(String(9))
    roles: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    skills: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    technologies: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    major: Mapped[Optional[str]] = mapped_column(Text())
    school: Mapped[Optional[str]] = mapped_column(Text())
    date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    interests: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    github: Mapped[Optional[str]] = mapped_column(Text())
    linkedin: Mapped[Optional[str]] = mapped_column(Text())
    bio: Mapped[Optional[str]] = mapped_column(Text())
    avatar_path: Mapped[Optional[str]] = mapped_column(Text())

    projects: Mapped[list['Project']] = relationship('Project', back_populates='owner')
    # joined_teams: Mapped[list['Team']] = relationship(
    #     'Team',
    #     secondary='accountteams',
    #     back_populates='members'
    # )
    applications: Mapped[list['Application']] = relationship('Application', back_populates='user')
    comments: Mapped[list['Comment']] = relationship('Comment', back_populates='user')
    sent_messages: Mapped[list[Message]] = relationship(
        'Message', foreign_keys=[Message.sender_id], back_populates='sender'
    )
    received_messages: Mapped[list[Message]] = relationship(
        'Message', foreign_keys=[Message.receiver_id], back_populates='receiver'
    )



