from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.models.feedback import FeedbackStatus


class FeedbackCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    message: str = Field(..., min_length=5, max_length=3000)
    is_anonymous: bool = Field(False, description="Option to submit feedback anonymously")


class FeedbackStatusUpdate(BaseModel):
    status: FeedbackStatus
    hr_response: Optional[str] = Field(None, max_length=2000, description="HR response or acknowledgment remarks")


class FeedbackResponse(BaseModel):
    id: int
    category: str
    rating: int
    message: str
    is_anonymous: bool
    status: FeedbackStatus
    hr_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitter_display: Optional[str] = None
    department_display: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackMetricsResponse(BaseModel):
    total_feedbacks: int
    average_rating: float
    rating_breakdown: Dict[int, int]
    category_breakdown: Dict[str, int]
