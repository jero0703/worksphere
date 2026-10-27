from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class EmployeeShiftSummary(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    effective_from: Optional[date] = None


class EmployeePerformanceSummary(BaseModel):
    id: int
    review_period: str
    rating: float
    feedback: Optional[str] = None


class EmployeeAttendanceSummary(BaseModel):
    date: str
    status: str
    is_late: bool
    check_in: Optional[str] = None
    check_out: Optional[str] = None


class EmployeeSearchItem(BaseModel):
    id: int
    employee_code: str
    full_name: str
    designation: str
    department: str
    joining_date: date
    salary: float
    phone: Optional[str] = None
    status: str
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
    current_shift: Optional[EmployeeShiftSummary] = None
    latest_performance: Optional[EmployeePerformanceSummary] = None
    today_attendance: Optional[EmployeeAttendanceSummary] = None
    documents_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EmployeeSearchResponse(BaseModel):
    items: List[EmployeeSearchItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    departments: List[str]
    designations: List[str]
