from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AccountCreate(BaseModel):
    name : str = Field( ..., max_length=50)
    email : EmailStr
    password: str = Field(..., min_length=8)
    grade: Optional[str] = Field(None, max_length=10)
    roles : List[str] = []
    skills : List[str] = []
    technologies : List[str] = []
    avatar: Optional[str] = None




class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    email: str
    grade: str | None
    roles: List[str] = []
    skills: List[str] = []
    technologies: List[str] = []
    avatar: str | None = None
    school: str | None = None
    bio: str | None = None

    @field_validator("roles", "skills", "technologies", mode="before")
    @classmethod
    def array_columns_none_to_list(cls, v: Any) -> list:
        return v if v is not None else []


class AccountUpdate(BaseModel):
    """Partial-update payload for PATCH /user/me. Only fields the client sends are applied."""

    name: Optional[str] = Field(default=None, max_length=50)
    grade: Optional[str] = Field(default=None, max_length=10)
    roles: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    avatar: Optional[str] = None
    school: Optional[str] = None
    bio: Optional[str] = None
