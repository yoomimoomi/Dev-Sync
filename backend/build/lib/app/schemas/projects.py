from pydantic import BaseModel, ConfigDict

from app.schemas.account import AccountRead


class ProjectBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: str
    title: str
    status: str

class ProjectRead(ProjectBase):
    owner: AccountRead
