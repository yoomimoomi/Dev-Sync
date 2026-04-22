from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, TypeDecorator
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ARRAY
from app.db.base import Base
from app.schemas.grade import Grade

class ChoiceArray(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(ARRAY(String))
        return dialect.type_descriptor(JSON)

class Account(Base):
    __tablename__ = "accounts"
    user_id = Column(String(10), primary_key=True, index=True)
    name = Column(String(50),unique=True,index=True,nullable=False)
    password_hash = Column(String(15), nullable=False)
    grade = Column(Enum(Grade), nullable=False)
    roles = Column(ChoiceArray, default=[])
    skills = Column(ChoiceArray, default=[])
    technologies = Column(ChoiceArray, default=[])
    notifications = Column(ChoiceArray, default=[])
    comments = Column(ChoiceArray, default=[])
    projects = Column(ChoiceArray, default=[])
