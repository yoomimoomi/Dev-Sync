from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer

from app.datetime_wire import to_iso_utc_z


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: str
    project_id: Optional[str] = None
    sender_id: Optional[str] = None
    receiver_id: Optional[str] = None
    content: Optional[str] = None
    is_read: Optional[bool] = None
    created_at: Optional[datetime] = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime | None) -> str | None:
        return to_iso_utc_z(v)


class ConversationRead(BaseModel):
    project_id: str
    project_title: str
    peer_user_id: str
    peer_name: str
    peer_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None

    @field_serializer("last_message_at")
    def _ser_last_message_at(self, v: datetime | None) -> str | None:
        return to_iso_utc_z(v)


class MarkThreadReadResult(BaseModel):
    updated_message_ids: list[str]
