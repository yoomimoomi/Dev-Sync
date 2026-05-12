from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ApplicationCreate(BaseModel):
    user_id: str | None = Field(default=None, max_length=10)
    project_id: str = Field(..., max_length=10)
    status: str | None = Field(default=None, max_length=8)
    content: str = Field(..., min_length=8)


class ApplicationRead(BaseModel):
    user_id: str = Field(..., max_length=10)
    project_id: str = Field(..., max_length=10)
    content: str | None = None
    created_at: datetime | None = None
    status: str | None = Field(default=None, max_length=8)

    model_config = ConfigDict(from_attributes=True)


class ApplicantView(BaseModel):
    project_title: str = Field(..., max_length=50)
    status: str = Field(..., max_length=12)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectOwnerView(BaseModel):
    user_id: str = Field(..., max_length=10)
    user_name: str = Field(..., max_length=50)
    project_id: str = Field(..., max_length=10)
    project_title: str = Field(..., max_length=50)
    status: str = Field(..., max_length=12)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


