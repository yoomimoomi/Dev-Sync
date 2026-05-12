from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.account import AccountRead
from app.schemas.comment import CommentRead


def _coerce_none_to_list(v: Any) -> list:
    return v if v is not None else []


class ProjectCreate(BaseModel):
    title: str
    description: str
    grade: str
    roles: list[str] = []
    skills: list[str] = []
    technologies: list[str] = []

class ProjectBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: str
    user_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    grade: Optional[str] = None
    roles: list[str] = []
    skills: list[str] = []
    technologies: list[str] = []
    is_deleted: Optional[bool] = None

    @field_validator("roles", "skills", "technologies", mode="before")
    @classmethod
    def array_columns_none_to_list(cls, v: Any) -> list:
        return _coerce_none_to_list(v)
    created_at: Optional[datetime] = None
    owner_name: Optional[str] = None


class ProjectRead(ProjectBase):
    owner: Optional[AccountRead] = None
    applicant_user_names: list[Optional[str]] = []
    accepted_team_members: list[AccountRead] = []
    commenter_names: list[Optional[str]] = []
    comments: list[CommentRead] = []
