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
