from datetime import datetime, date, timedelta, time, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave import Leave, LeaveStatus
from app.models.shift import Shift, EmployeeShift
from app.core.config import settings
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user

router = APIRouter(prefix="/calendar", tags=["Calendar Integration"])


def _format_ics_date(d: date) -> str:
    return d.strftime("%Y%m%d")


def _format_ics_datetime(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%SZ")


@router.get("/google/status", summary="Check Google Calendar Integration Configuration")
def google_calendar_status(
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the current status of the Google Calendar OAuth integration.
    Clearly indicates configuration state without falsely claiming live sync.
    """
    is_configured = bool(settings.GOOGLE_CALENDAR_CLIENT_ID and settings.GOOGLE_CALENDAR_CLIENT_ID.strip())
    return {
        "provider": "google_calendar",
        "configured": is_configured,
        "client_id_available": is_configured,
        "message": (
            "Google Calendar integration is ready for OAuth synchronization."
            if is_configured
            else "Google Calendar OAuth client ID is not configured. Set GOOGLE_CALENDAR_CLIENT_ID in .env to enable one-click sync."
        ),
    }


@router.get("/export.ics", summary="Export personal or team shifts and leaves as iCalendar (.ics)")
def export_icalendar(
    employee_id: Optional[int] = Query(None, description="Employee ID filter (HR/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generates an RFC 5545 compliant .ics file containing scheduled shifts and approved leaves.
    Can be directly imported into Google Calendar, Apple Calendar, or Outlook.
    """
    target_emp_id = None
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee profile found")
        target_emp_id = current_user.employee.id
    else:
        target_emp_id = employee_id

    # Fetch leaves
    leave_query = db.query(Leave).filter(Leave.status == LeaveStatus.APPROVED)
    if target_emp_id:
        leave_query = leave_query.filter(Leave.employee_id == target_emp_id)
    approved_leaves = leave_query.all()

    # Fetch active shifts
    shift_query = db.query(EmployeeShift).join(Shift).filter(EmployeeShift.effective_to.is_(None))
    if target_emp_id:
        shift_query = shift_query.filter(EmployeeShift.employee_id == target_emp_id)
    active_shifts = shift_query.all()

    # Build RFC 5545 iCalendar content
    now_stamp = _format_ics_datetime(datetime.now(timezone.utc))
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WorkSphere HRMS//WorkSphere Calendar 1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:WorkSphere Schedule & Leaves",
        "X-WR-TIMEZONE:UTC",
    ]

    # Add approved leave events
    for l in approved_leaves:
        emp_name = l.employee.full_name if l.employee else "Employee"
        start_d = _format_ics_date(l.start_date)
        # End date in iCal is exclusive, so add 1 day
        end_d = _format_ics_date(l.end_date + timedelta(days=1))
        ics_lines.extend([
            "BEGIN:VEVENT",
            f"UID:leave-{l.id}-{start_d}@worksphere.local",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART;VALUE=DATE:{start_d}",
            f"DTEND;VALUE=DATE:{end_d}",
            f"SUMMARY:Leave: {emp_name} ({l.leave_type.value})",
            f"DESCRIPTION:Reason: {l.reason or 'Approved Leave'}",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ])

    # Add recurring shift events for the current month
    today = date.today()
    start_of_month = today.replace(day=1)
    for day_offset in range(35):
        current_day = start_of_month + timedelta(days=day_offset)
        # Only weekdays for standard shifts
        if current_day.weekday() >= 5:
            continue

        for es in active_shifts:
            if es.effective_from <= current_day and (es.effective_to is None or es.effective_to >= current_day):
                s = es.shift
                emp_name = es.employee.full_name if es.employee else "Staff"
                start_dt = datetime.combine(current_day, s.start_time)
                # Check overnight shift
                if s.end_time < s.start_time:
                    end_dt = datetime.combine(current_day + timedelta(days=1), s.end_time)
                else:
                    end_dt = datetime.combine(current_day, s.end_time)

                s_stamp = _format_ics_datetime(start_dt)
                e_stamp = _format_ics_datetime(end_dt)
                ics_lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:shift-{es.id}-{_format_ics_date(current_day)}@worksphere.local",
                    f"DTSTAMP:{now_stamp}",
                    f"DTSTART:{s_stamp}",
                    f"DTEND:{e_stamp}",
                    f"SUMMARY:{s.name}: {emp_name}",
                    f"DESCRIPTION:WorkSphere Shift - {s.name} ({s.start_time} - {s.end_time})",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])

    ics_lines.append("END:VCALENDAR")
    ics_body = "\r\n".join(ics_lines)

    return Response(
        content=ics_body,
        media_type="text/calendar",
        headers={
            "Content-Disposition": "attachment; filename=worksphere_schedule.ics",
            "Cache-Control": "no-cache",
        },
    )
