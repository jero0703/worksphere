from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.announcement import AnnouncementPriority


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)
    priority: Optional[AnnouncementPriority] = AnnouncementPriority.MEDIUM


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    message: Optional[str] = Field(None, min_length=5, max_length=5000)
    priority: Optional[AnnouncementPriority] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    priority: AnnouncementPriority
    created_by: int
    created_at: datetime
    updated_at: datetime
    author_name: Optional[str] = None
    author_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
