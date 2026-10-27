from datetime import date
from decimal import Decimal
from typing import Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import Leave, LeaveStatus, LeaveBalance, LeavePolicy
from app.models.payroll import Payroll
from app.models.notification import Notification
from app.schemas.dashboard import (
    EmployeeDashboardStats,
    HrDashboardStats,
    AdminDashboardStats,
)
from app.services.attendance_service import _format_attendance_response
from app.services.payroll_service import _format_payroll_response
from app.schemas.leave import LeaveBalanceResponse


def get_employee_dashboard(db: Session, employee_id: int) -> EmployeeDashboardStats:
    """Compile real-time dashboard data for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    today = date.today()
    att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .first()
    )

    policies = {p.leave_type: p.total_days_allowed for p in db.query(LeavePolicy).all()}
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee_id).all()
    bal_responses = [
        LeaveBalanceResponse(
            id=b.id,
            employee_id=b.employee_id,
            employee_name=emp.full_name,
            employee_code=emp.employee_code,
            leave_type=b.leave_type,
            remaining_days=b.remaining_days,
            total_allowed=policies.get(b.leave_type, Decimal("0.0")),
        )
        for b in balances
    ]

    latest_pr = (
        db.query(Payroll)
        .filter(Payroll.employee_id == employee_id)
        .order_by(Payroll.month.desc())
        .first()
    )

    unread_notifs = 0
    if emp.user_id:
        unread_notifs = (
            db.query(Notification)
            .filter(Notification.user_id == emp.user_id, Notification.is_read.is_(False))
            .count()
        )

    pending_leaves = (
        db.query(Leave)
        .filter(Leave.employee_id == employee_id, Leave.status == LeaveStatus.PENDING)
        .count()
    )

    return EmployeeDashboardStats(
        employee_id=emp.id,
        full_name=emp.full_name,
        employee_code=emp.employee_code,
        department=emp.department,
        designation=emp.designation,
        joining_date=emp.joining_date,
        today_attendance=_format_attendance_response(att, emp) if att else None,
        leave_balances=bal_responses,
        latest_payroll=_format_payroll_response(latest_pr, emp) if latest_pr else None,
        unread_notifications_count=unread_notifs,
        pending_leaves_count=pending_leaves,
    )


def get_hr_dashboard(db: Session) -> HrDashboardStats:
    """Compile real-time statistics for HR managers."""
    today = date.today()
    current_month_str = today.strftime("%Y-%m")

    active_emp_count = (
        db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()
    )

    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    present_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    absent_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.ABSENT)
    half_day_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.HALF_DAY)
    late_cnt = sum(1 for r in today_records if r.is_late)

    pending_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.PENDING).count()
    approved_leaves_month = (
        db.query(Leave)
        .filter(
            Leave.status == LeaveStatus.APPROVED,
            func.extract("year", Leave.start_date) == today.year,
            func.extract("month", Leave.start_date) == today.month,
        )
        .count()
    )

    month_payrolls = db.query(Payroll).filter(Payroll.month == current_month_str).all()
    payroll_total = sum((p.net_salary for p in month_payrolls), Decimal("0.00"))

    departments_count = db.query(Employee.department).distinct().count()

    return HrDashboardStats(
        total_active_employees=active_emp_count,
        today_present_count=present_cnt,
        today_absent_count=absent_cnt,
        today_half_day_count=half_day_cnt,
        today_late_count=late_cnt,
        pending_leaves_count=pending_leaves,
        approved_leaves_this_month=approved_leaves_month,
        current_month_payroll_total=payroll_total,
        departments_count=departments_count,
    )


def get_admin_dashboard(db: Session) -> AdminDashboardStats:
    """Compile real-time organization metrics for administrators."""
    today = date.today()
    current_month_str = today.strftime("%Y-%m")

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active.is_(True)).count()

    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()

    # Role breakdown
    roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_map = {r[0].value if hasattr(r[0], "value") else str(r[0]): r[1] for r in roles}

    # Department breakdown
    depts = db.query(Employee.department, func.count(Employee.id)).group_by(Employee.department).all()
    dept_map = {d[0]: d[1] for d in depts}

    # Today attendance summary
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    present_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    absent_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.ABSENT)
    half_day_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.HALF_DAY)
    attendance_map = {
        "PRESENT": present_cnt,
        "ABSENT": absent_cnt,
        "HALF_DAY": half_day_cnt,
    }

    # Payroll total
    month_payrolls = db.query(Payroll).filter(Payroll.month == current_month_str).all()
    payroll_total = sum((p.net_salary for p in month_payrolls), Decimal("0.00"))

    pending_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.PENDING).count()

    return AdminDashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_employees=total_employees,
        active_employees=active_employees,
        role_breakdown=role_map,
        department_distribution=dept_map,
        today_attendance_summary=attendance_map,
        current_month_payroll_total=payroll_total,
        pending_leave_requests=pending_leaves,
    )
