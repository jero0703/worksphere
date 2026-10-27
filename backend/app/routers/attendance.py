from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.attendance import AttendanceStatus
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin
from app.schemas.attendance import (
    AttendanceCorrectionRequest,
    AttendanceResponse,
    AttendanceSummaryResponse,
    AutoAbsentResponse,
    CheckInResponse,
    CheckOutResponse,
)
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])


@router.post(
    "/check-in",
    response_model=CheckInResponse,
    summary="Record employee check-in",
    description="Records server-side timestamp for the authenticated employee. Automatically flags late arrival if past work start time and grace period.",
)
def check_in(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.employee:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile",
        )
    return attendance_service.check_in_employee(db, current_user.employee.id)


@router.post(
    "/check-out",
    response_model=CheckOutResponse,
    summary="Record employee check-out",
    description="Records server-side check-out timestamp, calculates working hours, and determines HALF_DAY or overtime status.",
)
def check_out(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.employee:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile",
        )
    return attendance_service.check_out_employee(db, current_user.employee.id)


@router.get(
    "/today",
    response_model=Optional[AttendanceResponse],
    summary="Get employee's attendance status today",
)
def get_today_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.employee:
        return None
    return attendance_service.get_employee_today_status(db, current_user.employee.id)


@router.get(
    "/me",
    response_model=List[AttendanceResponse],
    summary="Get personal attendance history",
    description="Retrieve personal attendance records for the authenticated employee.",
)
def get_personal_attendance(
    month: Optional[str] = Query(None, description="Filter month (YYYY-MM)"),
    year: Optional[int] = Query(None, description="Filter year (YYYY)"),
    limit: int = Query(60, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.employee:
        return []
    return attendance_service.get_employee_attendance_history(
        db, current_user.employee.id, month=month, year=year, limit=limit
    )


@router.get(
    "",
    response_model=List[AttendanceResponse],
    summary="Get all attendance records (HR/Admin)",
    description="Filter organizational attendance records by date, department, status, or employee.",
)
def get_all_attendance(
    date_val: Optional[date] = Query(None, alias="date"),
    department: Optional[str] = None,
    status_filter: Optional[AttendanceStatus] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    records, _ = attendance_service.get_all_attendance_records(
        db,
        target_date=date_val,
        department=department,
        status_filter=status_filter,
        employee_id=employee_id,
        limit=limit,
        offset=offset,
    )
    return records


@router.get(
    "/summary",
    response_model=AttendanceSummaryResponse,
    summary="Daily attendance summary (HR/Admin)",
)
def get_attendance_summary(
    date_val: Optional[date] = Query(None, alias="date"),
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    target = date_val or date.today()
    return attendance_service.get_attendance_daily_summary(db, target)


@router.patch(
    "/{attendance_id}/correct",
    response_model=AttendanceResponse,
    summary="Authorized attendance record correction (HR/Admin)",
    description="Corrects an employee's attendance record with audit tracking and reason logging.",
)
def correct_attendance(
    attendance_id: int,
    req: AttendanceCorrectionRequest,
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    return attendance_service.correct_attendance_record(db, attendance_id, req, current_user)


@router.post(
    "/process-daily-absent",
    response_model=AutoAbsentResponse,
    summary="Trigger auto-absence processing for eligible employees (HR/Admin)",
    description="Marks active employees without check-in or approved leave as ABSENT after cutoff time.",
)
def process_auto_absent(
    target_date: Optional[date] = None,
    force: bool = Query(False, description="Force execution even before cutoff hour or on weekends"),
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    return attendance_service.process_daily_absent_employees(db, target_date=target_date, force=force)
