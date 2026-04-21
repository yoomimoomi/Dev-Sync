from sqlalchemy import CHAR, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AccountTeam(Base):
    __tablename__ = 'accountteams'

    user_id: Mapped[str] = mapped_column(CHAR(10), ForeignKey('accounts.user_id'), primary_key=True)
    team_id: Mapped[str] = mapped_column(CHAR(10), ForeignKey('teams.team_id'), primary_key=True)
