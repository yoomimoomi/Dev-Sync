import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, CHAR, Text, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.team import Team


class Message(Base):
    __tablename__ = 'messages'
    __table_args__ = (
        ForeignKeyConstraint(['team_id'], ['teams.team_id'], name='messages_team_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['accounts.user_id'], name='messages_user_id_fkey'),
        PrimaryKeyConstraint('message_id', name='messages_pkey')
    )

    message_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    team_id: Mapped[Optional[str]] = mapped_column(CHAR(10))
    user_id: Mapped[Optional[str]] = mapped_column(CHAR(10))
    content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    user: Mapped[Optional['Account']] = relationship('Account', back_populates='messages')
