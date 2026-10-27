from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, model_validator

from app.models.leave import LeaveType, LeaveStatus


class LeavePolicyResponse(BaseModel):
    id: int
    leave_type: LeaveType
    total_days_allowed: Decimal

    model_config = {"from_attributes": True}


class LeavePolicyUpdate(BaseModel):
    total_days_allowed: Decimal = Field(..., gt=0, le=365)


class LeaveBalanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type: LeaveType
    remaining_days: Decimal
    total_allowed: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class LeaveCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=2, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date > self.end_date:
            raise ValueError("End date must be on or after start date")
        return self


class LeaveReviewRequest(BaseModel):
    status: LeaveStatus = Field(..., description="APPROVED or REJECTED")
    review_comment: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_status(self):
        if self.status not in [LeaveStatus.APPROVED, LeaveStatus.REJECTED]:
            raise ValueError("Review status must be either APPROVED or REJECTED")
        return self


class LeaveResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_requested: Decimal
    reason: str
    status: LeaveStatus
    is_balance_deducted: bool
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeaveCalendarItem(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_count: float
    status: LeaveStatus
    reason: str


class LeaveConflictItem(BaseModel):
    department: str
    conflict_date: date
    overlapping_count: int
    employees: list[dict]


class LeaveCalendarResponse(BaseModel):
    events: list[LeaveCalendarItem]
    conflicts: list[LeaveConflictItem]
    total_active_employees: int
    on_leave_today: int
    available_today: int
    department_summary: dict[str, int]
