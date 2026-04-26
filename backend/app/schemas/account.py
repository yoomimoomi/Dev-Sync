from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AccountCreate(BaseModel):
    name : str = Field( ..., max_length=50)
    email : EmailStr
    password: str = Field(..., min_length=8)
    grade: Optional[str] = Field(None, max_length=10)
    roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)




class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name : str = Field( ..., max_length=50)
    email: EmailStr
    grade: Optional[str] = Field(None, max_length=10)
    roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)

    @field_validator("roles", "skills", "technologies", mode="before")
    @classmethod
    def array_columns_none_to_list(cls, v: Any) -> list:
        return v if v is not None else []
