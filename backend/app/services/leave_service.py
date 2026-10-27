from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.leave import Leave, LeavePolicy, LeaveBalance, LeaveType, LeaveStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.notification import Notification
from app.models.user import User
from app.core.permissions import UserRole
from app.schemas.leave import (
    LeaveBalanceResponse,
    LeaveCreate,
    LeavePolicyResponse,
    LeavePolicyUpdate,
    LeaveResponse,
    LeaveReviewRequest,
    LeaveCalendarItem,
    LeaveConflictItem,
    LeaveCalendarResponse,
)


def calculate_leave_days(start_date: date, end_date: date) -> Decimal:
    """Calculate working business days (Mon-Fri) inclusive."""
    current = start_date
    working_days = 0
    total_days = (end_date - start_date).days + 1

    while current <= end_date:
        # 0 = Monday, 4 = Friday
        if current.weekday() < 5:
            working_days += 1
        current += timedelta(days=1)

    # If applying on a single weekend or zero working days found, count total calendar days
    if working_days == 0:
        working_days = max(1, total_days)

    return Decimal(str(working_days))


def _format_leave_response(leave: Leave) -> LeaveResponse:
    emp = leave.employee
    reviewer = leave.reviewer
    return LeaveResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=emp.full_name if emp else None,
        employee_code=emp.employee_code if emp else None,
        department=emp.department if emp else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_requested=leave.days_requested,
        reason=leave.reason,
        status=leave.status,
        is_balance_deducted=leave.is_balance_deducted,
        reviewed_by=leave.reviewed_by,
        reviewer_name=reviewer.username if reviewer else None,
        reviewed_at=leave.reviewed_at,
        review_comment=leave.review_comment,
        created_at=leave.created_at,
        updated_at=leave.updated_at,
    )


def apply_for_leave(db: Session, employee_id: int, req: LeaveCreate) -> LeaveResponse:
    """Employee submits a leave application with balance validation and overlap checks."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    if req.start_date > req.end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after start date")

    days_requested = calculate_leave_days(req.start_date, req.end_date)

    # Check remaining leave balance
    balance = (
        db.query(LeaveBalance)
        .filter(LeaveBalance.employee_id == employee_id, LeaveBalance.leave_type == req.leave_type)
        .first()
    )
    if not balance:
        # Initialize default if missing
        policy = db.query(LeavePolicy).filter(LeavePolicy.leave_type == req.leave_type).first()
        initial_days = policy.total_days_allowed if policy else Decimal("10.0")
        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type=req.leave_type,
            remaining_days=initial_days,
        )
        db.add(balance)
        db.flush()

    if days_requested > balance.remaining_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient leave balance: Requested {days_requested} days, but you only have "
                f"{balance.remaining_days} {req.leave_type.value} days remaining."
            ),
        )

    # Check for overlapping active or pending leave applications
    overlap = (
        db.query(Leave)
        .filter(
            Leave.employee_id == employee_id,
            Leave.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
            or_(
                and_(Leave.start_date <= req.start_date, Leave.end_date >= req.start_date),
                and_(Leave.start_date <= req.end_date, Leave.end_date >= req.end_date),
                and_(Leave.start_date >= req.start_date, Leave.end_date <= req.end_date),
            ),
        )
        .first()
    )
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Overlapping leave request already exists ({overlap.start_date} to {overlap.end_date}, status: {overlap.status.value}).",
        )

    leave = Leave(
        employee_id=employee_id,
        leave_type=req.leave_type,
        start_date=req.start_date,
        end_date=req.end_date,
        days_requested=days_requested,
        reason=req.reason,
        status=LeaveStatus.PENDING,
        is_balance_deducted=False,
    )
    db.add(leave)

    # Notify HR
    db.add(Notification(
        user_id=emp.user_id,
        title="Leave Application Submitted",
        message=f"Your {req.leave_type.value} leave request for {days_requested} days has been submitted for approval.",
    ))

    db.commit()
    db.refresh(leave)
    return _format_leave_response(leave)


def approve_leave_request(
    db: Session,
    leave_id: int,
    reviewer_user: User,
    comment: Optional[str] = None,
) -> LeaveResponse:
    """
    Approve leave with row-level locking, preventing duplicate deduction and ensuring concurrency safety.
    """
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    if leave.status == LeaveStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request is already approved.",
        )

    # Prevent self-approval if HR/Admin is approving their own leave
    if leave.employee.user_id == reviewer_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You cannot approve your own leave application.",
        )

    # Row lock on LeaveBalance to prevent race conditions during concurrent approvals
    balance = (
        db.query(LeaveBalance)
        .filter(
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type == leave.leave_type,
        )
        .with_for_update()
        .first()
    )

    if not balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave balance record missing for this employee and type.",
        )

    if balance.remaining_days < leave.days_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve: remaining balance ({balance.remaining_days} days) is less than requested ({leave.days_requested} days).",
        )

    # Deduct balance safely
    if not leave.is_balance_deducted:
        balance.remaining_days -= leave.days_requested
        leave.is_balance_deducted = True

    leave.status = LeaveStatus.APPROVED
    leave.reviewed_by = reviewer_user.id
    leave.reviewed_at = datetime.now()
    leave.review_comment = comment

    # Notify employee
    if leave.employee.user_id:
        db.add(Notification(
            user_id=leave.employee.user_id,
            title="Leave Request Approved! ✅",
            message=f"Your {leave.leave_type.value} leave ({leave.start_date} to {leave.end_date}) was approved. {comment or ''}",
        ))

    db.commit()
    db.refresh(leave)
    return _format_leave_response(leave)


def reject_leave_request(
    db: Session,
    leave_id: int,
    reviewer_user: User,
    comment: Optional[str] = None,
) -> LeaveResponse:
    """Reject a pending leave application."""
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject request with status {leave.status.value}",
        )

    leave.status = LeaveStatus.REJECTED
    leave.reviewed_by = reviewer_user.id
    leave.reviewed_at = datetime.now()
    leave.review_comment = comment

    # Notify employee
    if leave.employee.user_id:
        db.add(Notification(
            user_id=leave.employee.user_id,
            title="Leave Request Rejected ❌",
            message=f"Your {leave.leave_type.value} leave request was declined: {comment or 'No comment provided.'}",
        ))

    db.commit()
    db.refresh(leave)
    return _format_leave_response(leave)


def cancel_leave_request(
    db: Session,
    leave_id: int,
    user: User,
) -> LeaveResponse:
    """
    Cancel a leave request. If it was previously approved, restore the deducted leave balance.
    """
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    # Only owner or HR/Admin can cancel
    if user.role == "EMPLOYEE" and leave.employee.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel another employee's leave")

    # Restore balance if it was previously deducted
    if leave.status == LeaveStatus.APPROVED and leave.is_balance_deducted:
        balance = (
            db.query(LeaveBalance)
            .filter(
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type == leave.leave_type,
            )
            .with_for_update()
            .first()
        )
        if balance:
            balance.remaining_days += leave.days_requested
            leave.is_balance_deducted = False

    leave.status = LeaveStatus.CANCELLED
    leave.cancelled_by = user.id
    leave.cancelled_at = datetime.now()

    if leave.employee.user_id:
        db.add(Notification(
            user_id=leave.employee.user_id,
            title="Leave Request Cancelled",
            message=f"Leave request for {leave.start_date} to {leave.end_date} has been cancelled. Any deducted balance was restored.",
        ))

    db.commit()
    db.refresh(leave)
    return _format_leave_response(leave)


def get_employee_leave_balances(db: Session, employee_id: int) -> List[LeaveBalanceResponse]:
    """Retrieve remaining days by leave type for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return []

    policies = {p.leave_type: p.total_days_allowed for p in db.query(LeavePolicy).all()}
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee_id).all()

    results = []
    for b in balances:
        results.append(
            LeaveBalanceResponse(
                id=b.id,
                employee_id=b.employee_id,
                employee_name=emp.full_name,
                employee_code=emp.employee_code,
                leave_type=b.leave_type,
                remaining_days=b.remaining_days,
                total_allowed=policies.get(b.leave_type, Decimal("0.0")),
            )
        )
    return results


def get_all_leave_balances(
    db: Session,
    department: Optional[str] = None,
) -> List[LeaveBalanceResponse]:
    """HR/Admin overview of all employee leave balances."""
    query = db.query(LeaveBalance).join(Employee)
    if department:
        query = query.filter(Employee.department == department)

    policies = {p.leave_type: p.total_days_allowed for p in db.query(LeavePolicy).all()}
    balances = query.all()

    return [
        LeaveBalanceResponse(
            id=b.id,
            employee_id=b.employee_id,
            employee_name=b.employee.full_name,
            employee_code=b.employee.employee_code,
            leave_type=b.leave_type,
            remaining_days=b.remaining_days,
            total_allowed=policies.get(b.leave_type, Decimal("0.0")),
        )
        for b in balances
    ]


def get_all_leave_policies(db: Session) -> List[LeavePolicyResponse]:
    """List leave policies."""
    policies = db.query(LeavePolicy).all()
    return [LeavePolicyResponse.model_validate(p) for p in policies]


def update_leave_policy(db: Session, policy_id: int, req: LeavePolicyUpdate) -> LeavePolicyResponse:
    """Update total days allowed for a leave type."""
    policy = db.query(LeavePolicy).filter(LeavePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave policy not found")

    policy.total_days_allowed = req.total_days_allowed
    db.commit()
    db.refresh(policy)
    return LeavePolicyResponse.model_validate(policy)


def get_leave_applications(
    db: Session,
    employee_id: Optional[int] = None,
    status_filter: Optional[LeaveStatus] = None,
    department: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[LeaveResponse], int]:
    """List leave applications with filtering and pagination."""
    query = db.query(Leave).join(Employee)
    if employee_id:
        query = query.filter(Leave.employee_id == employee_id)
    if status_filter:
        query = query.filter(Leave.status == status_filter)
    if department:
        query = query.filter(Employee.department == department)

    total = query.count()
    records = query.order_by(Leave.created_at.desc()).offset(offset).limit(limit).all()
    return [_format_leave_response(r) for r in records], total


def get_leave_calendar(
    db: Session,
    current_user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
) -> LeaveCalendarResponse:
    today = date.today()
    s_date = start_date or (today.replace(day=1) - timedelta(days=7))
    e_date = end_date or (today.replace(day=28) + timedelta(days=14))

    query = (
        db.query(Leave)
        .join(Employee)
        .filter(
            Leave.status == LeaveStatus.APPROVED,
            Leave.start_date <= e_date,
            Leave.end_date >= s_date,
        )
    )

    if department:
        query = query.filter(Employee.department == department)

    leaves = query.order_by(Leave.start_date.asc()).all()

    current_emp_id = current_user.employee.id if current_user.employee else None
    is_privileged = current_user.role in [UserRole.HR, UserRole.ADMIN]

    calendar_items: List[LeaveCalendarItem] = []
    date_dept_map: dict[Tuple[date, str], list[Employee]] = {}

    for lv in leaves:
        emp = lv.employee
        reason = lv.reason if (is_privileged or lv.employee_id == current_emp_id) else "On Scheduled Leave"

        item = LeaveCalendarItem(
            id=lv.id,
            employee_id=lv.employee_id,
            employee_name=emp.full_name if emp else "Unknown",
            employee_code=emp.employee_code if emp else "N/A",
            department=emp.department if emp else "General",
            leave_type=lv.leave_type,
            start_date=lv.start_date,
            end_date=lv.end_date,
            days_count=float(lv.days_requested),
            status=lv.status,
            reason=reason,
        )
        calendar_items.append(item)

        # Track for conflict detection
        cur = max(lv.start_date, s_date)
        while cur <= min(lv.end_date, e_date):
            if cur.weekday() < 5:
                key = (cur, emp.department if emp else "General")
                if key not in date_dept_map:
                    date_dept_map[key] = []
                if emp and emp not in date_dept_map[key]:
                    date_dept_map[key].append(emp)
            cur += timedelta(days=1)

    conflicts: List[LeaveConflictItem] = []
    for (c_date, dept), emps in date_dept_map.items():
        if len(emps) >= 2:
            conflicts.append(
                LeaveConflictItem(
                    department=dept,
                    conflict_date=c_date,
                    overlapping_count=len(emps),
                    employees=[{"id": e.id, "name": e.full_name, "code": e.employee_code} for e in emps],
                )
            )

    conflicts.sort(key=lambda x: x.conflict_date)

    # Availability stats
    active_emp_query = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE)
    if department:
        active_emp_query = active_emp_query.filter(Employee.department == department)
    total_active = active_emp_query.count()

    on_leave_today_query = (
        db.query(Leave)
        .join(Employee)
        .filter(
            Leave.status == LeaveStatus.APPROVED,
            Leave.start_date <= today,
            Leave.end_date >= today,
        )
    )
    if department:
        on_leave_today_query = on_leave_today_query.filter(Employee.department == department)
    on_leave_today_leaves = on_leave_today_query.all()
    on_leave_count = len(on_leave_today_leaves)
    available_today = max(0, total_active - on_leave_count)

    dept_summary: dict[str, int] = {}
    for lv in on_leave_today_leaves:
        dept = lv.employee.department if lv.employee else "General"
        dept_summary[dept] = dept_summary.get(dept, 0) + 1

    return LeaveCalendarResponse(
        events=calendar_items,
        conflicts=conflicts,
        total_active_employees=total_active,
        on_leave_today=on_leave_count,
        available_today=available_today,
        department_summary=dept_summary,
    )
