from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.account import AccountRead


class CommentCreate(BaseModel):
    project_id: str = Field(..., max_length=10)
    content: str = Field(..., min_length=1)
    # When present, the new comment becomes a reply to that comment_id.
    reply_to: Optional[str] = Field(default=None, max_length=10)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comment_id: str
    user_id: str
    project_id: str
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    reply_to: Optional[str] = None
    user: Optional[AccountRead] = None
