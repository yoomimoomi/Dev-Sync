from datetime import datetime
from pydantic import BaseModel

class NotificationCreate(BaseModel):
    user_id: str
    project_id: str
    title: str
    content: str

class NotificationRead(BaseModel):
    user_id: str
    project_id: str
    title: str
    content: str
    created_at: datetime