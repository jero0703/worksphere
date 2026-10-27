from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class PerformanceBase(BaseModel):
    review_period: str = Field(..., min_length=2, max_length=50, json_schema_extra={"example": "Q1 2026"})
    rating: float = Field(..., ge=1.0, le=5.0, json_schema_extra={"example": 4.5})
    feedback: str = Field(..., min_length=3, json_schema_extra={"example": "Consistently exceeds project deliverables and collaborates well."})
    goals: Optional[str] = Field(None, json_schema_extra={"example": "Lead the migration of backend services to microservices."})


class PerformanceCreate(PerformanceBase):
    employee_id: int


class PerformanceUpdate(BaseModel):
    review_period: Optional[str] = Field(None, min_length=2, max_length=50)
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    feedback: Optional[str] = Field(None, min_length=3)
    goals: Optional[str] = None


class PerformanceResponse(PerformanceBase):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PerformanceSummary(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: Dict[str, int]
    top_performers_count: int
