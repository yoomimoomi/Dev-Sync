from pydantic import BaseModel, EmailStr,Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from sqlalchemy import String


class AccountCreate(BaseModel):
    name : str = Field( ..., max_length=50)
    email : EmailStr
    password : str = Field(...,min_length=8)
    grade: Optional[str] = Field(None, max_length=10)
    roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)




class AccountRead(BaseModel):
    user_id: str
    name : str = Field( ..., max_length=50)
    email: EmailStr
    grade: Optional[str] = Field(None, max_length=10)
    roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)

    class Config:
        from_attributes=True
