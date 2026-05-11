from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: str
    project_id: Optional[str] = None
    sender_id: Optional[str] = None
    receiver_id: Optional[str] = None
    content: Optional[str] = None
    is_read: Optional[bool] = None
    created_at: Optional[datetime] = None


class ConversationRead(BaseModel):
    project_id: str
    project_title: str
    peer_user_id: str
    peer_name: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None


class MarkThreadReadResult(BaseModel):
    updated_message_ids: list[str]
