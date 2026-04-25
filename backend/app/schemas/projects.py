from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.account import AccountRead

class ProjectBase(BaseModel):
    user_id: str = Field(..., max_length=10)
    title: str = Field(..., max_length=50)
    status: str = Field(default="Open", max_length=6)
    grade: Optional[str] = Field(default=None, max_length=10)
    roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)


class ProjectCreate(ProjectBase):
    description: str = Field(..., min_length=8)


class ProjectPost(BaseModel):
    project_id: str
    title: str = Field(..., max_length=50)
    status: str
    grade: Optional[str] = Field(default=None, max_length=10)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProjectRead(ProjectBase):
    project_id: str
    owner: AccountRead
    description: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
