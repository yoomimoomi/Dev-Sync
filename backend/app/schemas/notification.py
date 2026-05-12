from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.datetime_wire import to_iso_utc_z


class NotificationRead(BaseModel):
    """API shape for one row in `notifications` (matches DB column `read`)."""

    id: str
    project_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime | None) -> str | None:
        return to_iso_utc_z(v)


class NotificationsMarkReadBody(BaseModel):
    ids: list[str] = Field(default_factory=list, max_length=200)
