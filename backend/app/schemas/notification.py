from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotificationRead(BaseModel):
    """API shape for one row in `notifications` (matches DB column `read`)."""

    id: str
    project_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None


class NotificationsMarkReadBody(BaseModel):
    ids: list[str] = Field(default_factory=list, max_length=200)
