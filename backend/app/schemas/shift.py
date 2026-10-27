from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel, Field, computed_field


class ShiftBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Shift display name (e.g. Morning Shift)")
    start_time: time = Field(..., description="Shift scheduled start time (HH:MM:SS)")
    end_time: time = Field(..., description="Shift scheduled end time (HH:MM:SS)")
    description: Optional[str] = Field(None, description="Optional description of the shift")
    is_active: bool = Field(True, description="Whether shift is active")


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ShiftResponse(ShiftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def is_overnight(self) -> bool:
        return self.start_time > self.end_time

    @computed_field
    @property
    def duration_hours(self) -> float:
        start_secs = self.start_time.hour * 3600 + self.start_time.minute * 60 + self.start_time.second
        end_secs = self.end_time.hour * 3600 + self.end_time.minute * 60 + self.end_time.second
        if self.start_time > self.end_time:
            # Crosses midnight: (86400 - start_secs) + end_secs
            diff_secs = (86400 - start_secs) + end_secs
        else:
            diff_secs = end_secs - start_secs
        return round(diff_secs / 3600.0, 2)

    model_config = {"from_attributes": True}


class EmployeeShiftAssign(BaseModel):
    employee_id: int
    shift_id: int
    effective_from: date
    effective_to: Optional[date] = None


class EmployeeShiftResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    shift_id: int
    shift_name: Optional[str] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    is_overnight: bool = False
    duration_hours: float = 0.0
    effective_from: date
    effective_to: Optional[date] = None
    assigned_by: Optional[int] = None
    assigned_by_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShiftAttendanceProcessResponse(BaseModel):
    date: date
    processed_count: int
    marked_absent_count: int
    details: str
