from pydantic import BaseModel, EmailStr,Field, ConfigDict
from typing import List, Optional

from sqlalchemy import String


class AccountCreate(BaseModel):
    name : str = Field( ..., max_length=50)
    email : EmailStr
    password : str = Field(String,min_length=8)
    grade: Optional[str] = Field(None, max_length=10)
    roles : List[str] = []
    skills : List[str] = []
    technologies : List[str] = []




class AccountRead(BaseModel):
    user_id: str
    name: str
    email: str
    grade: str | None
    roles: List[str] = []
    skills: List[str] = []
    technologies: List[str] = []

    class Config:
        from_attributes=True
