from app.schemas.auth import LoginRequest, RegisterRequest, Token, TokenPayload
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserResponse, UserProfile, EmployeeSummary
from app.schemas.attendance import (
    AttendanceResponse,
    CheckInResponse,
    CheckOutResponse,
    AttendanceCorrectionRequest,
    AttendanceSummaryResponse,
    AutoAbsentResponse,
)
from app.schemas.leave import (
    LeaveCreate,
    LeaveResponse,
    LeaveReviewRequest,
    LeavePolicyResponse,
    LeavePolicyUpdate,
    LeaveBalanceResponse,
)
from app.schemas.payroll import (
    PayrollGenerateRequest,
    PayrollResponse,
    PayrollSummaryResponse,
    PayrollStatusUpdateRequest,
)
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.schemas.dashboard import (
    EmployeeDashboardStats,
    HrDashboardStats,
    AdminDashboardStats,
)

from app.schemas.shift import (
    ShiftBase,
    ShiftCreate,
    ShiftUpdate,
    ShiftResponse,
    EmployeeShiftAssign,
    EmployeeShiftResponse,
    ShiftAttendanceProcessResponse,
)

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "Token",
    "TokenPayload",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserProfile",
    "EmployeeSummary",
    "AttendanceResponse",
    "CheckInResponse",
    "CheckOutResponse",
    "AttendanceCorrectionRequest",
    "AttendanceSummaryResponse",
    "AutoAbsentResponse",
    "LeaveCreate",
    "LeaveResponse",
    "LeaveReviewRequest",
    "LeavePolicyResponse",
    "LeavePolicyUpdate",
    "LeaveBalanceResponse",
    "PayrollGenerateRequest",
    "PayrollResponse",
    "PayrollSummaryResponse",
    "PayrollStatusUpdateRequest",
    "NotificationResponse",
    "UnreadCountResponse",
    "EmployeeDashboardStats",
    "HrDashboardStats",
    "AdminDashboardStats",
]
