from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.resignation import ResignationStatus


class ResignationCreate(BaseModel):
    reason: str = Field(..., min_length=5, max_length=2000, description="Reason for resignation")
    notice_period: int = Field(30, ge=1, le=180, description="Notice period in days")


class ResignationReviewRequest(BaseModel):
    status: ResignationStatus = Field(..., description="Target status (APPROVED or REJECTED)")
    review_comment: Optional[str] = Field(None, max_length=1000, description="HR/Admin review remarks")


class ResignationResponse(BaseModel):
    id: int
    employee_id: int
    reason: str
    notice_period: int
    status: ResignationStatus
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    reviewer_name: Optional[str] = None
    expected_last_working_day: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)
