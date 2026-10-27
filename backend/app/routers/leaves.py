from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.leave import LeaveStatus
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin
from app.schemas.leave import (
    LeaveBalanceResponse,
    LeaveCreate,
    LeavePolicyResponse,
    LeavePolicyUpdate,
    LeaveResponse,
    LeaveReviewRequest,
    LeaveCalendarResponse,
)
from app.services import leave_service

router = APIRouter(prefix="/leaves", tags=["Leave Management"])


@router.get(
    "/policies",
    response_model=List[LeavePolicyResponse],
    summary="List leave policies",
    description="Retrieve organizational leave policies for SICK, CASUAL, and PAID leaves.",
)
def list_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return leave_service.get_all_leave_policies(db)


@router.put(
    "/policies/{policy_id}",
    response_model=LeavePolicyResponse,
    summary="Update leave policy allowance (HR/Admin)",
)
def update_policy(
    policy_id: int,
    req: LeavePolicyUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return leave_service.update_leave_policy(db, policy_id, req)


@router.get(
    "/balances/me",
    response_model=List[LeaveBalanceResponse],
    summary="Get remaining leave balances for current employee",
)
def get_my_leave_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        return []
    return leave_service.get_employee_leave_balances(db, current_user.employee.id)


@router.get(
    "/balances",
    response_model=List[LeaveBalanceResponse],
    summary="Get all employee leave balances (HR/Admin)",
)
def get_all_balances(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return leave_service.get_all_leave_balances(db, department=department)


@router.post(
    "",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for leave",
    description="Employee submits a leave request with balance verification and overlapping date checks.",
)
def apply_leave(
    req: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile",
        )
    return leave_service.apply_for_leave(db, current_user.employee.id, req)


@router.get(
    "/me",
    response_model=List[LeaveResponse],
    summary="Get my leave applications history",
)
def get_my_leaves(
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        return []
    records, _ = leave_service.get_leave_applications(
        db,
        employee_id=current_user.employee.id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return records


@router.get(
    "",
    response_model=List[LeaveResponse],
    summary="Get all leave applications (HR/Admin)",
)
def get_all_leaves(
    employee_id: Optional[int] = None,
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    department: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    records, _ = leave_service.get_leave_applications(
        db,
        employee_id=employee_id,
        status_filter=status_filter,
        department=department,
        limit=limit,
        offset=offset,
    )
    return records


@router.patch(
    "/{leave_id}/approve",
    response_model=LeaveResponse,
    summary="Approve leave application (HR/Admin)",
    description="Approve leave, deduct leave balance with concurrency protection, and notify employee.",
)
def approve_leave(
    leave_id: int,
    req: Optional[LeaveReviewRequest] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    comment = req.review_comment if req else None
    return leave_service.approve_leave_request(db, leave_id, admin_user, comment)


@router.patch(
    "/{leave_id}/reject",
    response_model=LeaveResponse,
    summary="Reject leave application (HR/Admin)",
)
def reject_leave(
    leave_id: int,
    req: LeaveReviewRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return leave_service.reject_leave_request(db, leave_id, admin_user, req.review_comment)


@router.patch(
    "/{leave_id}/cancel",
    response_model=LeaveResponse,
    summary="Cancel leave request and restore balance if approved",
)
def cancel_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return leave_service.cancel_leave_request(db, leave_id, current_user)


@router.get(
    "/calendar",
    response_model=LeaveCalendarResponse,
    summary="Team leave calendar and availability view",
    description="Retrieve team leave events for calendar visualization, conflict detection, and team availability stats.",
)
def get_team_leave_calendar(
    start_date: Optional[date] = Query(None, description="Start date for calendar interval"),
    end_date: Optional[date] = Query(None, description="End date for calendar interval"),
    department: Optional[str] = Query(None, description="Filter by department"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return leave_service.get_leave_calendar(
        db,
        current_user,
        start_date=start_date,
        end_date=end_date,
        department=department,
    )
