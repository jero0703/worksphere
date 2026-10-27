from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.leave import Leave, LeaveStatus
from app.models.user import User
from app.models.shift import Shift, EmployeeShift
from app.schemas.attendance import (
    AttendanceCorrectionRequest,
    AttendanceResponse,
    AttendanceSummaryResponse,
    AutoAbsentResponse,
    CheckInResponse,
    CheckOutResponse,
)
from app.core.config import settings
from app.services.shift_service import get_active_shift_for_employee


def _format_attendance_response(att: Attendance, emp: Optional[Employee] = None) -> AttendanceResponse:
    employee = emp or att.employee
    shift = att.shift
    return AttendanceResponse(
        id=att.id,
        employee_id=att.employee_id,
        employee_code=employee.employee_code if employee else None,
        employee_name=employee.full_name if employee else None,
        department=employee.department if employee else None,
        date=att.date,
        check_in=att.check_in,
        check_out=att.check_out,
        working_hours=att.working_hours,
        status=att.status,
        is_late=att.is_late,
        late_minutes=att.late_minutes,
        is_early_departure=att.is_early_departure if hasattr(att, "is_early_departure") else False,
        early_departure_minutes=att.early_departure_minutes if hasattr(att, "early_departure_minutes") else 0,
        shift_id=att.shift_id,
        shift_name=shift.name if shift else None,
        overtime_hours=att.overtime_hours,
        notes=att.notes,
        correction_notes=att.correction_notes,
        corrected_by=att.corrected_by,
        corrected_at=att.corrected_at,
        created_at=att.created_at,
        updated_at=att.updated_at,
    )


def check_in_employee(db: Session, employee_id: int) -> CheckInResponse:
    """Record server-side check-in for an employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee or employee.status != EmployeeStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active employee record not found",
        )

    today = date.today()
    now = datetime.now()

    # Check for existing attendance today
    existing = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .first()
    )

    if existing and existing.check_in is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in already recorded for today at {existing.check_in.strftime('%H:%M:%S')}",
        )

    # Resolve assigned shift for employee today
    shift = get_active_shift_for_employee(db, employee_id, today)
    if shift:
        start_hour, start_minute = shift.start_time.hour, shift.start_time.minute
        shift_id = shift.id
        shift_name = shift.name
    else:
        start_hour, start_minute = map(int, settings.WORK_START_TIME.split(":"))
        shift_id = None
        shift_name = None

    cutoff_time = now.replace(
        hour=start_hour,
        minute=start_minute,
        second=0,
        microsecond=0,
    ) + timedelta(minutes=settings.LATE_GRACE_MINUTES)

    is_late = False
    late_minutes = 0
    if now > cutoff_time:
        is_late = True
        official_start = now.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        late_minutes = int((now - official_start).total_seconds() // 60)

    if existing:
        # Overwrite a placeholder record (e.g. from premature absent marker)
        existing.check_in = now
        existing.status = AttendanceStatus.PRESENT
        existing.is_late = is_late
        existing.late_minutes = late_minutes
        if shift_id:
            existing.shift_id = shift_id
        db.commit()
        db.refresh(existing)
        att = existing
    else:
        att = Attendance(
            employee_id=employee_id,
            date=today,
            check_in=now,
            status=AttendanceStatus.PRESENT,
            working_hours=Decimal("0.00"),
            is_late=is_late,
            late_minutes=late_minutes,
            is_early_departure=False,
            early_departure_minutes=0,
            shift_id=shift_id,
            overtime_hours=Decimal("0.00"),
        )
        db.add(att)
        db.commit()
        db.refresh(att)

    msg = f"Check-in successful at {now.strftime('%I:%M %p')}."
    if shift_name:
        msg += f" Shift: {shift_name}."
    if is_late:
        msg += f" Note: Recorded as late arrival ({late_minutes} mins past scheduled start)."
        if employee.user_id:
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    db=db,
                    user_id=employee.user_id,
                    title="Late Check-In Alert",
                    message=f"You checked in at {now.strftime('%I:%M %p')}, which is {late_minutes} minutes past your scheduled start time.",
                    link="/attendance",
                )
            except Exception:
                pass

    return CheckInResponse(
        message=msg,
        attendance=_format_attendance_response(att, employee),
        is_late=is_late,
        late_minutes=late_minutes,
        shift_name=shift_name,
    )


def check_out_employee(db: Session, employee_id: int) -> CheckOutResponse:
    """Record server-side check-out and compute working hours, early departure, and overtime."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    today = date.today()
    now = datetime.now()

    att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .first()
    )

    if not att or not att.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out without an active check-in for today.",
        )

    if att.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-out already completed for today at {att.check_out.strftime('%H:%M:%S')}.",
        )

    att.check_out = now
    duration_hours = Decimal(str(round((now - att.check_in).total_seconds() / 3600.0, 2)))
    att.working_hours = duration_hours

    # Standard half-day rule
    if duration_hours < Decimal(str(settings.HALF_DAY_HOURS)):
        att.status = AttendanceStatus.HALF_DAY
    else:
        att.status = AttendanceStatus.PRESENT

    # Shift-aware early departure & overtime detection
    shift = att.shift or get_active_shift_for_employee(db, employee_id, att.date)
    is_early_departure = False
    early_departure_minutes = 0

    if shift:
        if not att.shift_id:
            att.shift_id = shift.id

        is_overnight = shift.start_time > shift.end_time
        if is_overnight:
            scheduled_end = datetime.combine(att.date + timedelta(days=1), shift.end_time)
            start_secs = shift.start_time.hour * 3600 + shift.start_time.minute * 60 + shift.start_time.second
            end_secs = shift.end_time.hour * 3600 + shift.end_time.minute * 60 + shift.end_time.second
            scheduled_duration = Decimal(str(round(((86400 - start_secs) + end_secs) / 3600.0, 2)))
        else:
            scheduled_end = datetime.combine(att.date, shift.end_time)
            start_secs = shift.start_time.hour * 3600 + shift.start_time.minute * 60 + shift.start_time.second
            end_secs = shift.end_time.hour * 3600 + shift.end_time.minute * 60 + shift.end_time.second
            scheduled_duration = Decimal(str(round((end_secs - start_secs) / 3600.0, 2)))

        if now < scheduled_end:
            is_early_departure = True
            early_departure_minutes = int((scheduled_end - now).total_seconds() // 60)

        # Overtime logged if actual hours exceed scheduled shift duration
        if duration_hours > scheduled_duration:
            att.overtime_hours = duration_hours - scheduled_duration
        else:
            att.overtime_hours = Decimal("0.00")
    else:
        standard_day = Decimal(str(settings.WORK_DAY_HOURS))
        if duration_hours > standard_day:
            att.overtime_hours = duration_hours - standard_day
        else:
            att.overtime_hours = Decimal("0.00")

    att.is_early_departure = is_early_departure
    att.early_departure_minutes = early_departure_minutes

    db.commit()
    db.refresh(att)

    msg = f"Check-out successful at {now.strftime('%I:%M %p')}. Total shift: {att.working_hours} hours."
    if att.overtime_hours > Decimal("0.00"):
        msg += f" Overtime logged: {att.overtime_hours} hours."
    if is_early_departure:
        msg += f" Note: Early departure recorded ({early_departure_minutes} mins before shift end)."

    return CheckOutResponse(
        message=msg,
        attendance=_format_attendance_response(att, employee),
        working_hours=att.working_hours,
        overtime_hours=att.overtime_hours,
        is_early_departure=is_early_departure,
        early_departure_minutes=early_departure_minutes,
    )


def get_employee_today_status(db: Session, employee_id: int) -> Optional[AttendanceResponse]:
    """Retrieve today's attendance record for an employee if present."""
    today = date.today()
    att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .first()
    )
    if not att:
        return None
    return _format_attendance_response(att)


def get_employee_attendance_history(
    db: Session,
    employee_id: int,
    month: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 50,
) -> List[AttendanceResponse]:
    """Retrieve personal attendance records for an employee."""
    query = db.query(Attendance).filter(Attendance.employee_id == employee_id)

    if month:
        # Format YYYY-MM
        try:
            parts = month.split("-")
            y, m = int(parts[0]), int(parts[1])
            # Filter by month and year
            query = query.filter(
                func.extract("year", Attendance.date) == y,
                func.extract("month", Attendance.date) == m,
            )
        except Exception:
            pass
    elif year:
        query = query.filter(func.extract("year", Attendance.date) == year)

    records = query.order_by(Attendance.date.desc()).limit(limit).all()
    return [_format_attendance_response(r) for r in records]


def get_all_attendance_records(
    db: Session,
    target_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[AttendanceStatus] = None,
    employee_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[AttendanceResponse], int]:
    """HR/Admin query for attendance records with filtering and pagination."""
    query = db.query(Attendance).join(Employee)

    if target_date:
        query = query.filter(Attendance.date == target_date)
    if department:
        query = query.filter(Employee.department == department)
    if status_filter:
        query = query.filter(Attendance.status == status_filter)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    total = query.count()
    records = query.order_by(Attendance.date.desc()).offset(offset).limit(limit).all()
    return [_format_attendance_response(r) for r in records], total


def get_attendance_daily_summary(db: Session, target_date: date) -> AttendanceSummaryResponse:
    """Calculate organization attendance stats for a specific day."""
    active_employees = (
        db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()
    )

    records = db.query(Attendance).filter(Attendance.date == target_date).all()
    present_cnt = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent_cnt = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    half_day_cnt = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
    late_cnt = sum(1 for r in records if r.is_late)
    on_time_cnt = sum(1 for r in records if r.status == AttendanceStatus.PRESENT and not r.is_late)

    rate = 0.0
    if active_employees > 0:
        rate = round((present_cnt + half_day_cnt * 0.5) / active_employees * 100.0, 1)

    return AttendanceSummaryResponse(
        date=target_date,
        total_active_employees=active_employees,
        present_count=present_cnt,
        absent_count=absent_cnt,
        half_day_count=half_day_cnt,
        late_count=late_cnt,
        on_time_count=on_time_cnt,
        attendance_rate=rate,
    )


def correct_attendance_record(
    db: Session,
    attendance_id: int,
    req: AttendanceCorrectionRequest,
    admin_user: User,
) -> AttendanceResponse:
    """Authorized administrative correction of an attendance record with audit tracking."""
    att = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    att.status = req.status
    if req.check_in is not None:
        att.check_in = req.check_in
    if req.check_out is not None:
        att.check_out = req.check_out

    if att.check_in and att.check_out:
        att.working_hours = Decimal(str(round((att.check_out - att.check_in).total_seconds() / 3600.0, 2)))
    elif req.status == AttendanceStatus.ABSENT:
        att.working_hours = Decimal("0.00")

    att.correction_notes = req.correction_notes
    att.corrected_by = admin_user.id
    att.corrected_at = datetime.now()

    db.commit()
    db.refresh(att)
    return _format_attendance_response(att)


def process_daily_absent_employees(
    db: Session,
    target_date: Optional[date] = None,
    force: bool = False,
) -> AutoAbsentResponse:
    """
    Automated or manual command to mark eligible employees ABSENT.
    Excludes employees who have checked in, approved leaves, or weekends.
    Safe for repeated executions.
    """
    eval_date = target_date or date.today()
    now = datetime.now()

    # Rule: Check cutoff hour unless forced
    if eval_date == date.today() and not force:
        if now.hour < settings.AUTO_ABSENT_CUTOFF_HOUR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auto-absence cannot run before workday cutoff ({settings.AUTO_ABSENT_CUTOFF_HOUR}:00). Current time is {now.strftime('%H:%M')}.",
            )

    # Exclude weekends (Saturday = 5, Sunday = 6)
    if eval_date.weekday() >= 5 and not force:
        return AutoAbsentResponse(
            date=eval_date,
            marked_absent_count=0,
            details="Weekend date; auto-absence processing skipped.",
        )

    # Active employees
    active_employees = (
        db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).all()
    )

    # Existing attendance records for this date
    existing_records = {
        att.employee_id: att
        for att in db.query(Attendance).filter(Attendance.date == eval_date).all()
    }

    # Approved leaves covering this date
    approved_leaves = (
        db.query(Leave)
        .filter(
            Leave.status == LeaveStatus.APPROVED,
            Leave.start_date <= eval_date,
            Leave.end_date >= eval_date,
        )
        .all()
    )
    on_leave_employee_ids = {lv.employee_id for lv in approved_leaves}

    marked_count = 0
    for emp in active_employees:
        # Skip if already has an attendance entry
        if emp.id in existing_records:
            continue
        # Skip if on approved leave
        if emp.id in on_leave_employee_ids:
            continue

        # Resolve employee's assigned shift
        shift = get_active_shift_for_employee(db, emp.id, eval_date)
        shift_id = shift.id if shift else None

        # Check shift completion before auto-marking absent (unless force=True)
        if shift and (shift.start_time > shift.end_time) and not force:
            # Overnight shift ends the following morning
            shift_end_datetime = datetime.combine(eval_date + timedelta(days=1), shift.end_time)
            cutoff_datetime = shift_end_datetime + timedelta(minutes=settings.LATE_GRACE_MINUTES)
            if now < cutoff_datetime:
                continue
        elif shift and not force and eval_date == date.today():
            shift_end_datetime = datetime.combine(eval_date, shift.end_time)
            cutoff_datetime = shift_end_datetime + timedelta(minutes=settings.LATE_GRACE_MINUTES)
            if now < cutoff_datetime:
                continue

        # Mark absent
        absent_record = Attendance(
            employee_id=emp.id,
            date=eval_date,
            check_in=None,
            check_out=None,
            working_hours=Decimal("0.00"),
            status=AttendanceStatus.ABSENT,
            shift_id=shift_id,
            notes="Auto-marked absent: no check-in recorded before cutoff.",
            is_late=False,
            late_minutes=0,
            is_early_departure=False,
            early_departure_minutes=0,
            overtime_hours=Decimal("0.00"),
        )
        db.add(absent_record)
        marked_count += 1

    db.commit()
    return AutoAbsentResponse(
        date=eval_date,
        marked_absent_count=marked_count,
        details=f"Processed auto-absence for {eval_date}. Marked {marked_count} employee(s) absent.",
    )
