from datetime import date, datetime, time, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from fastapi import HTTPException, status

from app.models.shift import Shift, EmployeeShift
from app.models.employee import Employee, EmployeeStatus
from app.models.user import User
from app.schemas.shift import (
    ShiftCreate,
    ShiftUpdate,
    ShiftResponse,
    EmployeeShiftAssign,
    EmployeeShiftResponse,
)


def _format_shift_response(shift: Shift) -> ShiftResponse:
    return ShiftResponse.model_validate(shift)


def _format_employee_shift_response(es: EmployeeShift) -> EmployeeShiftResponse:
    shift = es.shift
    emp = es.employee
    assigner = es.assigner

    is_overnight = False
    duration_hours = 0.0
    if shift:
        is_overnight = shift.start_time > shift.end_time
        start_secs = shift.start_time.hour * 3600 + shift.start_time.minute * 60 + shift.start_time.second
        end_secs = shift.end_time.hour * 3600 + shift.end_time.minute * 60 + shift.end_time.second
        diff_secs = (86400 - start_secs) + end_secs if is_overnight else (end_secs - start_secs)
        duration_hours = round(diff_secs / 3600.0, 2)

    return EmployeeShiftResponse(
        id=es.id,
        employee_id=es.employee_id,
        employee_code=emp.employee_code if emp else None,
        employee_name=emp.full_name if emp else None,
        department=emp.department if emp else None,
        shift_id=es.shift_id,
        shift_name=shift.name if shift else None,
        shift_start=shift.start_time if shift else None,
        shift_end=shift.end_time if shift else None,
        is_overnight=is_overnight,
        duration_hours=duration_hours,
        effective_from=es.effective_from,
        effective_to=es.effective_to,
        assigned_by=es.assigned_by,
        assigned_by_name=assigner.username if assigner else None,
        created_at=es.created_at,
    )


def list_shifts(db: Session, active_only: bool = False) -> List[ShiftResponse]:
    """Retrieve all defined shifts."""
    query = db.query(Shift)
    if active_only:
        query = query.filter(Shift.is_active == True)
    shifts = query.order_by(Shift.start_time.asc()).all()
    return [_format_shift_response(s) for s in shifts]


def get_shift_by_id(db: Session, shift_id: int) -> Shift:
    """Retrieve single shift by ID or raise 404."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found",
        )
    return shift


def create_shift(db: Session, shift_in: ShiftCreate) -> ShiftResponse:
    """Create a new work shift with unique name validation."""
    existing = db.query(Shift).filter(Shift.name == shift_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A shift named '{shift_in.name}' already exists",
        )

    shift = Shift(
        name=shift_in.name,
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        description=shift_in.description,
        is_active=shift_in.is_active,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return _format_shift_response(shift)


def update_shift(db: Session, shift_id: int, shift_in: ShiftUpdate) -> ShiftResponse:
    """Update shift details."""
    shift = get_shift_by_id(db, shift_id)

    if shift_in.name is not None and shift_in.name != shift.name:
        existing = db.query(Shift).filter(Shift.name == shift_in.name, Shift.id != shift_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A shift named '{shift_in.name}' already exists",
            )
        shift.name = shift_in.name

    if shift_in.start_time is not None:
        shift.start_time = shift_in.start_time
    if shift_in.end_time is not None:
        shift.end_time = shift_in.end_time
    if shift_in.description is not None:
        shift.description = shift_in.description
    if shift_in.is_active is not None:
        shift.is_active = shift_in.is_active

    db.commit()
    db.refresh(shift)
    return _format_shift_response(shift)


def delete_shift(db: Session, shift_id: int) -> dict:
    """Deactivate or remove shift if not currently assigned."""
    shift = get_shift_by_id(db, shift_id)

    # Check if actively assigned to employees
    active_assignments = (
        db.query(EmployeeShift)
        .filter(EmployeeShift.shift_id == shift_id)
        .count()
    )
    if active_assignments > 0:
        # Soft-deactivate to preserve historical integrity
        shift.is_active = False
        db.commit()
        return {"message": f"Shift '{shift.name}' is assigned to employees and was deactivated rather than deleted"}

    db.delete(shift)
    db.commit()
    return {"message": f"Shift '{shift.name}' deleted successfully"}


def get_active_shift_for_employee(
    db: Session, employee_id: int, target_date: Optional[date] = None
) -> Optional[Shift]:
    """Find the active shift for an employee on a specific date (defaults to today)."""
    check_date = target_date or date.today()
    assignment = (
        db.query(EmployeeShift)
        .filter(
            EmployeeShift.employee_id == employee_id,
            EmployeeShift.effective_from <= check_date,
            or_(
                EmployeeShift.effective_to.is_(None),
                EmployeeShift.effective_to >= check_date,
            ),
        )
        .order_by(desc(EmployeeShift.effective_from), desc(EmployeeShift.id))
        .first()
    )

    if assignment and assignment.shift and assignment.shift.is_active:
        return assignment.shift

    # If no active assignment exists for this employee, return None (never auto-assign shifts)
    return None


def assign_shift_to_employee(
    db: Session,
    assign_in: EmployeeShiftAssign,
    assigned_by_user_id: Optional[int] = None,
) -> EmployeeShiftResponse:
    """Assign a shift to an employee starting from an effective date, closing prior open assignments."""
    emp = db.query(Employee).filter(Employee.id == assign_in.employee_id).first()
    if not emp or emp.status != EmployeeStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active employee record not found",
        )

    shift = get_shift_by_id(db, assign_in.shift_id)
    if not shift.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive shift",
        )

    if assign_in.effective_to and assign_in.effective_to < assign_in.effective_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="effective_to date cannot be earlier than effective_from",
        )

    # Close prior open assignments that start before this new assignment
    prior_open = (
        db.query(EmployeeShift)
        .filter(
            EmployeeShift.employee_id == assign_in.employee_id,
            EmployeeShift.effective_to.is_(None),
            EmployeeShift.effective_from < assign_in.effective_from,
        )
        .all()
    )
    for prev in prior_open:
        prev.effective_to = assign_in.effective_from - timedelta(days=1)

    new_assignment = EmployeeShift(
        employee_id=assign_in.employee_id,
        shift_id=assign_in.shift_id,
        effective_from=assign_in.effective_from,
        effective_to=assign_in.effective_to,
        assigned_by=assigned_by_user_id,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    if emp.user_id:
        try:
            from app.services.notification_service import create_notification
            create_notification(
                db=db,
                user_id=emp.user_id,
                title="Shift Assignment Updated",
                message=f"You have been assigned to shift '{shift.name}' ({shift.start_time.strftime('%H:%M')} - {shift.end_time.strftime('%H:%M')}) effective from {assign_in.effective_from}.",
                link="/shifts",
            )
        except Exception:
            pass

    return _format_employee_shift_response(new_assignment)


def list_shift_assignments(
    db: Session,
    employee_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    active_only: bool = False,
) -> List[EmployeeShiftResponse]:
    """List employee shift assignments with optional filters."""
    query = db.query(EmployeeShift).join(Employee).join(Shift)

    if employee_id:
        query = query.filter(EmployeeShift.employee_id == employee_id)
    if shift_id:
        query = query.filter(EmployeeShift.shift_id == shift_id)
    if active_only:
        today = date.today()
        query = query.filter(
            EmployeeShift.effective_from <= today,
            or_(EmployeeShift.effective_to.is_(None), EmployeeShift.effective_to >= today),
        )

    assignments = query.order_by(desc(EmployeeShift.effective_from), desc(EmployeeShift.id)).all()
    return [_format_employee_shift_response(a) for a in assignments]


def delete_shift_assignment(db: Session, assignment_id: int) -> dict:
    """Remove a shift assignment."""
    assignment = db.query(EmployeeShift).filter(EmployeeShift.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Shift assignment removed successfully"}


def get_employee_shift_details(
    db: Session, employee_id: int, target_date: Optional[date] = None
) -> dict:
    """Return employee's active shift and full assignment history."""
    check_date = target_date or date.today()
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    active_shift = get_active_shift_for_employee(db, employee_id, check_date)
    history = list_shift_assignments(db, employee_id=employee_id)

    return {
        "employee_id": emp.id,
        "employee_name": emp.full_name,
        "employee_code": emp.employee_code,
        "department": emp.department,
        "active_shift": _format_shift_response(active_shift) if active_shift else None,
        "history": history,
    }
