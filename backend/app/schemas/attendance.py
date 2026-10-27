from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from app.models.attendance import AttendanceStatus


class AttendanceBase(BaseModel):
    date: date
    status: AttendanceStatus = AttendanceStatus.PRESENT
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    working_hours: Decimal
    status: AttendanceStatus
    is_late: bool
    late_minutes: int
    is_early_departure: bool = False
    early_departure_minutes: int = 0
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    overtime_hours: Decimal
    notes: Optional[str] = None
    correction_notes: Optional[str] = None
    corrected_by: Optional[int] = None
    corrected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckInResponse(BaseModel):
    message: str
    attendance: AttendanceResponse
    is_late: bool
    late_minutes: int
    shift_name: Optional[str] = None


class CheckOutResponse(BaseModel):
    message: str
    attendance: AttendanceResponse
    working_hours: Decimal
    overtime_hours: Decimal
    is_early_departure: bool = False
    early_departure_minutes: int = 0


class AttendanceCorrectionRequest(BaseModel):
    status: AttendanceStatus
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    correction_notes: str = Field(..., min_length=3, description="Reason for administrative correction")


class AttendanceSummaryResponse(BaseModel):
    date: date
    total_active_employees: int
    present_count: int
    absent_count: int
    half_day_count: int
    late_count: int
    on_time_count: int
    attendance_rate: float


class AutoAbsentResponse(BaseModel):
    date: date
    marked_absent_count: int
    details: str
