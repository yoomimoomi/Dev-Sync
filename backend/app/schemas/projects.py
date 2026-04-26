from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.account import AccountRead

def _coerce_none_to_list(v: Any) -> list:
    return v if v is not None else []


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
    owner: Optional[AccountRead] = None
    description: str
    created_at: datetime
    user_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    grade: Optional[str] = None
    roles: list[str] = []
    skills: list[str] = []
    technologies: list[str] = []
    applicant_user_names: list[Optional[str]] = []
    commenter_names: list[Optional[str]] = []
    model_config = ConfigDict(from_attributes=True)

      
    @field_validator("roles", "skills", "technologies", mode="before")
    @classmethod
    def array_columns_none_to_list(cls, v: Any) -> list:
        return _coerce_none_to_list(v)
    created_at: Optional[datetime] = None
    owner_name: Optional[str] = None
