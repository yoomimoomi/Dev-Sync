from pydantic import BaseModel, EmailStr, Field
from typing import List

from app.schemas.grade import Grade


class AccountBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    user_id: str
    firstname: str
    lastname: str
    email: EmailStr
    grade: Grade
    roles: List[str] = Field(default_factory=list,max_length=50)
    technologies: List[str] = Field(default_factory=list,max_length=50)
    skills: List[str] = Field(default_factory=list,max_length=50)
    projects: List[str] = Field(default_factory=list,max_length=50)
    comments: List[str] = Field(default_factory=list)
    notifications: List[str] = Field(default_factory=list)

class AccountIn(AccountBase):
    password : str

class AccountOut(AccountBase):
    pass

class AccountInDB(AccountBase):
    hashed_password: str




