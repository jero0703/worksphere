from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_any_role, verify_employee_ownership
from app.schemas.shift import (
    ShiftCreate,
    ShiftUpdate,
    ShiftResponse,
    EmployeeShiftAssign,
    EmployeeShiftResponse,
    ShiftAttendanceProcessResponse,
)
from app.services import shift_service
from app.services import attendance_service

router = APIRouter(prefix="/shifts", tags=["Shifts & Shift Management"])


@router.get("", response_model=List[ShiftResponse], summary="List all shifts")
def get_shifts(
    active_only: bool = Query(False, description="Filter for active shifts only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve all shift configurations. Open to all authenticated users."""
    return shift_service.list_shifts(db, active_only=active_only)


@router.post("", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED, summary="Create shift")
def create_shift(
    shift_in: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """Create a new work shift. Restricted to HR and ADMIN."""
    return shift_service.create_shift(db, shift_in)


@router.get("/assignments", response_model=List[EmployeeShiftResponse], summary="List shift assignments")
def get_shift_assignments(
    employee_id: Optional[int] = Query(None, description="Filter by employee ID"),
    shift_id: Optional[int] = Query(None, description="Filter by shift ID"),
    active_only: bool = Query(False, description="Filter active assignments only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """List employee shift assignments with filters. Restricted to HR and ADMIN."""
    return shift_service.list_shift_assignments(
        db, employee_id=employee_id, shift_id=shift_id, active_only=active_only
    )


@router.post("/assign", response_model=EmployeeShiftResponse, status_code=status.HTTP_201_CREATED, summary="Assign shift")
def assign_shift(
    assign_in: EmployeeShiftAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """Assign or reassign an employee to a shift. Restricted to HR and ADMIN."""
    return shift_service.assign_shift_to_employee(db, assign_in, assigned_by_user_id=current_user.id)


@router.delete("/assignments/{assignment_id}", response_model=dict, summary="Delete shift assignment")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """Remove a shift assignment. Restricted to HR and ADMIN."""
    return shift_service.delete_shift_assignment(db, assignment_id)


@router.get("/my-shift", response_model=dict, summary="Get current user's assigned shift")
def get_my_shift(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve personal shift assignment and history for the currently logged in employee."""
    if not current_user.employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not linked to user account.",
        )
    return shift_service.get_employee_shift_details(db, current_user.employee.id)


@router.get("/employee/{employee_id}", response_model=dict, summary="Get employee's assigned shift details")
def get_employee_shift(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve employee's active shift and historical assignments. Enforces resource ownership."""
    verify_employee_ownership(current_user, employee_id)
    return shift_service.get_employee_shift_details(db, employee_id)


@router.post("/process-attendance", response_model=ShiftAttendanceProcessResponse, summary="Automated attendance processing")
def process_automated_attendance(
    target_date: Optional[date] = Query(None, description="Date to evaluate (defaults to today)"),
    force: bool = Query(False, description="Override cutoff hour constraints"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """
    Trigger scheduled or manual shift-aware automated attendance processing.
    Evaluates shift end times, overnight shifts, approved leaves, and marks eligible employees absent idempotently.
    """
    res = attendance_service.process_daily_absent_employees(db, target_date=target_date, force=force)
    return ShiftAttendanceProcessResponse(
        date=res.date,
        processed_count=res.marked_absent_count,
        marked_absent_count=res.marked_absent_count,
        details=res.details,
    )


@router.get("/{shift_id}", response_model=ShiftResponse, summary="Get shift by ID")
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve details for a specific shift."""
    shift = shift_service.get_shift_by_id(db, shift_id)
    return shift_service._format_shift_response(shift)


@router.put("/{shift_id}", response_model=ShiftResponse, summary="Update shift")
def update_shift(
    shift_id: int,
    shift_in: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """Update shift details. Restricted to HR and ADMIN."""
    return shift_service.update_shift(db, shift_id, shift_in)


@router.delete("/{shift_id}", response_model=dict, summary="Delete/deactivate shift")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role([UserRole.HR, UserRole.ADMIN])),
):
    """Delete or deactivate shift. Restricted to HR and ADMIN."""
    return shift_service.delete_shift(db, shift_id)
