from typing import Optional, TYPE_CHECKING

from sqlalchemy import CHAR, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.project import Project


class Team(Base):
    __tablename__ = 'teams'

    team_id: Mapped[str] = mapped_column(
        CHAR(10),
        ForeignKey('projects.project_id'),
        primary_key=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        CHAR(10),
        ForeignKey('accounts.user_id')
    )

    project: Mapped["Project"] = relationship("Project")
    owner: Mapped[Optional["Account"]] = relationship("Account")
    # members: Mapped[list["Account"]] = relationship(
    #     "Account",
    #     secondary="accountteams",
    #     back_populates="joined_teams"
    # )