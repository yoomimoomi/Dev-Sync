import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, ForeignKeyConstraint, PrimaryKeyConstraint, CHAR, Text, DateTime, text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.project import Project


class Message(Base):
    __tablename__ = 'messages'
    __table_args__ = (
        ForeignKeyConstraint(['project_id'], ['projects.project_id'], name='messages_project_id_fkey'),
        ForeignKeyConstraint(['sender_id'], ['accounts.user_id'], name='messages_sender_id_fkey'),
        ForeignKeyConstraint(['receiver_id'], ['accounts.user_id'], name='messages_receiver_id_fkey'),
        PrimaryKeyConstraint('message_id', name='messages_pkey')
    )

    message_id: Mapped[str] = mapped_column(CHAR(10), primary_key=True)
    project_id: Mapped[Optional[str]] = mapped_column(CHAR(10))
    sender_id: Mapped[Optional[str]] = mapped_column(CHAR(10))
    receiver_id: Mapped[Optional[str]] = mapped_column(CHAR(10))
    content: Mapped[Optional[str]] = mapped_column(Text)
    is_read: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('FALSE'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    # NULL when this message is not a reply. If the parent message is deleted,
    # ON DELETE SET NULL keeps this row alive instead of leaving a dangling id.
    
    sender: Mapped[Optional['Account']] = relationship('Account', back_populates='sent_messages', foreign_keys=[sender_id])
    receiver: Mapped[Optional['Account']] = relationship('Account', back_populates='received_messages', foreign_keys=[receiver_id])
    project: Mapped[Optional['Project']] = relationship('Project')