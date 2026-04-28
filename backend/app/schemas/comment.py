from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.account import AccountRead


class CommentCreate(BaseModel):
    project_id: str = Field(..., max_length=10)
    content: str = Field(..., min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    project_id: str
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    user: Optional[AccountRead] = None
