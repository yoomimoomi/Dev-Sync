from typing import Optional

from sqlalchemy import String, PrimaryKeyConstraint, UniqueConstraint, CHAR
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.base import Base

class Account(Base):
    __tablename__ = 'accounts'
    __table_args__ = (
        PrimaryKeyConstraint('user_id', name='accounts_pkey'),
        UniqueConstraint('email', name='accounts_email_key')
    )

    user_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(15))
    name: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(50))
    grade: Mapped[Optional[str]] = mapped_column(String(9))
    roles: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    skills: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))
    technologies: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(length=20)))

    projects: Mapped[list['Project']] = relationship('Project', back_populates='owner')
    joined_teams: Mapped[list['Team']] = relationship(
        'Team',
        secondary='accountteams',
        back_populates='members'
    )
    applications: Mapped[list['Application']] = relationship('Application', back_populates='user')
    comments: Mapped[list['Comment']] = relationship('Comment', back_populates='user')
    messages: Mapped[list['Message']] = relationship('Message', back_populates='user')
