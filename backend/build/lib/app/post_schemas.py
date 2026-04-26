from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class pagepost(BaseModel):
    title: str = Field(min_length=3, max_length=50)
    description: str = Field(min_length=3, max_length=250)
    author: str = Field(min_length=3, max_length=50)
    roles: list[str] = Field(default_factory=list, max_length=50)
    languages: list[str] = Field(default_factory=list, max_length=50)
    technologies: list[str] = Field(default_factory=list, max_length=50)
    skills: dict[str, int] = Field(default_factory=dict)
    year: str = Field(min_length=3, max_length=50)
    major: str = Field(min_length=3, max_length=50)
    platfrom: str = Field(min_length=3, max_length=50)
    category: str = Field(min_length=3, max_length=50)
    date: datetime = Field(default=datetime.now())


class signup(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(min_length=3, max_length=50)
    password: str = Field(min_length=3, max_length=50)
    school: str = Field(min_length=3, max_length=50)
    major: str = Field(min_length=3, max_length=50)
    date: datetime = Field(default=datetime.now())
    interests: list[str] = Field(default_factory=list, max_length=50)
    roles: list[str] = Field(default_factory=list, max_length=50)
    technologies: list[str] = Field(default_factory=list, max_length=50)
    skills: dict[str, int] = Field(default_factory=dict)
    github: str = Field(min_length=3, max_length=50)
    linkedin: str = Field(min_length=3, max_length=50)
    
class comments(BaseModel):
    user_id: str = Field(min_length=3, max_length=50)
    project_id: str = Field(min_length=3, max_length=50)
    content: str = Field(min_length=3, max_length=250)
    date: datetime = Field(default=datetime.now())

class notifications(BaseModel):
    user_id: str = Field(min_length=3, max_length=50)
    type: str = Field(min_length=3, max_length=50)
    title: str = Field(min_length=3, max_length=50)
    time: datetime = Field(default=datetime.now())
    read: bool = Field(default=False)
    project_id: str = Field(min_length=3, max_length=50)
    description: str = Field(min_length=3, max_length=250)
    

    
    
    
