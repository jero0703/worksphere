from datetime import date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.schemas.attendance import AttendanceResponse
from app.schemas.leave import LeaveBalanceResponse
from app.schemas.payroll import PayrollResponse


class EmployeeDashboardStats(BaseModel):
    employee_id: int
    full_name: str
    employee_code: str
    department: str
    designation: str
    joining_date: date
    today_attendance: Optional[AttendanceResponse] = None
    leave_balances: List[LeaveBalanceResponse] = []
    latest_payroll: Optional[PayrollResponse] = None
    unread_notifications_count: int = 0
    pending_leaves_count: int = 0


class HrDashboardStats(BaseModel):
    total_active_employees: int
    today_present_count: int
    today_absent_count: int
    today_half_day_count: int
    today_late_count: int
    pending_leaves_count: int
    approved_leaves_this_month: int
    current_month_payroll_total: Decimal
    departments_count: int


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_employees: int
    active_employees: int
    role_breakdown: Dict[str, int]
    department_distribution: Dict[str, int]
    today_attendance_summary: Dict[str, int]
    current_month_payroll_total: Decimal
    pending_leave_requests: int
