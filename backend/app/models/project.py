from __future__ import annotations

import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKeyConstraint, PrimaryKeyConstraint, Text, DateTime, text, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.associationproxy import association_proxy, AssociationProxy
from app.db.base import Base
from app.models.account import Account

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.comment import Comment
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
    is_deleted: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('FALSE'))

    owner: Mapped[Optional['Account']] = relationship('Account', back_populates='projects')
    owner_name: AssociationProxy[Optional[str]] = association_proxy('owner', 'name')
    applications: Mapped[list['Application']] = relationship('Application', back_populates='project', passive_deletes=True)
    comments: Mapped[list['Comment']] = relationship('Comment', back_populates='project', passive_deletes=True)

    @property
    def applicant_user_names(self) -> list[Optional[str]]:
        return [a.user.name for a in self.applications]

    @property
    def accepted_team_members(self) -> list[dict]:
        """Accepted applicants with profile fields and their assigned project role."""
        members: list[dict] = []
        seen: set[str] = set()
        for app in self.applications:
            if (app.status or "").strip().lower() != "accepted":
                continue
            if app.user is None:
                continue
            uid = (app.user.user_id or "").strip()
            if not uid or uid in seen:
                continue
            seen.add(uid)
            user = app.user
            members.append(
                {
                    "user_id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "grade": user.grade,
                    "roles": user.roles or [],
                    "skills": user.skills or [],
                    "technologies": user.technologies or [],
                    "avatar": user.avatar,
                    "school": user.school,
                    "bio": user.bio,
                    "project_role": (app.role or "").strip() or None,
                }
            )
        return members

    @property
    def filled_roles(self) -> list[str]:
        """Roles filled by accepted team members only."""
        filled: list[str] = []
        seen: set[str] = set()
        for app in self.applications:
            role = (app.role or "").strip()
            if not role:
                continue
            status = (app.status or "").strip().lower()
            if status != "accepted":
                continue
            if role in seen:
                continue
            seen.add(role)
            filled.append(role)
        return filled

    @property
    def commenter_names(self) -> list[Optional[str]]:
        return [c.user.name for c in self.comments]
