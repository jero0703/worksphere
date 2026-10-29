import csv
import io
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.payroll import Payroll
from app.models.leave import Leave
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user

router = APIRouter(prefix="/exports", tags=["Report & Data Exports"])


def sanitize_csv_cell(val) -> str:
    """
    Sanitize CSV field to prevent CSV formula injection (DDE/Formula execution attacks).
    Any value starting with '=', '+', '-', '@', '\t', or '\r' is prefixed with a single quote.
    """
    if val is None:
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


@router.get("/attendance.csv", summary="Export attendance records as sanitized CSV")
def export_attendance_csv(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    employee_id: Optional[int] = Query(None, description="Employee ID filter (HR/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Attendance).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee record associated")
        query = query.filter(Attendance.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc(), Attendance.employee_id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID",
        "Employee Code",
        "Employee Name",
        "Department",
        "Date",
        "Check In",
        "Check Out",
        "Work Hours",
        "Status",
    ])

    for r in records:
        writer.writerow([
            sanitize_csv_cell(r.id),
            sanitize_csv_cell(r.employee.employee_code if r.employee else ""),
            sanitize_csv_cell(r.employee.full_name if r.employee else ""),
            sanitize_csv_cell(r.employee.department if r.employee else ""),
            sanitize_csv_cell(r.date.isoformat() if r.date else ""),
            sanitize_csv_cell(r.check_in.strftime("%H:%M:%S") if r.check_in else ""),
            sanitize_csv_cell(r.check_out.strftime("%H:%M:%S") if r.check_out else ""),
            sanitize_csv_cell(f"{float(r.working_hours or 0):.2f}"),
            sanitize_csv_cell(r.status.value if r.status else ""),
        ])

    csv_data = output.getvalue()
    filename = f"worksphere_attendance_{date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/payroll.csv", summary="Export payroll records as sanitized CSV")
def export_payroll_csv(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    employee_id: Optional[int] = Query(None, description="Employee ID filter (HR/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Payroll).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee record associated")
        query = query.filter(Payroll.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)

    if month:
        query = query.filter(Payroll.month == month)

    records = query.order_by(Payroll.month.desc(), Payroll.employee_id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Payroll ID",
        "Employee Code",
        "Employee Name",
        "Department",
        "Month",
        "Basic Salary",
        "Allowances",
        "Deductions",
        "Bonus",
        "Net Salary",
        "Status",
    ])

    for r in records:
        writer.writerow([
            sanitize_csv_cell(r.id),
            sanitize_csv_cell(r.employee.employee_code if r.employee else ""),
            sanitize_csv_cell(r.employee.full_name if r.employee else ""),
            sanitize_csv_cell(r.employee.department if r.employee else ""),
            sanitize_csv_cell(r.month),
            sanitize_csv_cell(f"{float(r.basic_salary):.2f}"),
            sanitize_csv_cell(f"{float(r.allowances or 0):.2f}"),
            sanitize_csv_cell(f"{float(r.deductions or 0):.2f}"),
            sanitize_csv_cell(f"{float(r.bonus or 0):.2f}"),
            sanitize_csv_cell(f"{float(r.net_salary):.2f}"),
            sanitize_csv_cell(r.status.value if r.status else ""),
        ])

    csv_data = output.getvalue()
    filename = f"worksphere_payroll_{date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/leaves.csv", summary="Export leave records as sanitized CSV")
def export_leaves_csv(
    year: Optional[int] = Query(None, description="Year"),
    employee_id: Optional[int] = Query(None, description="Employee ID filter (HR/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Leave).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee record associated")
        query = query.filter(Leave.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Leave.employee_id == employee_id)

    records = query.order_by(Leave.start_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Leave ID",
        "Employee Code",
        "Employee Name",
        "Leave Type",
        "Start Date",
        "End Date",
        "Days Count",
        "Reason",
        "Status",
    ])

    for r in records:
        days = (r.end_date - r.start_date).days + 1 if r.start_date and r.end_date else 1
        writer.writerow([
            sanitize_csv_cell(r.id),
            sanitize_csv_cell(r.employee.employee_code if r.employee else ""),
            sanitize_csv_cell(r.employee.full_name if r.employee else ""),
            sanitize_csv_cell(r.leave_type.value if r.leave_type else ""),
            sanitize_csv_cell(r.start_date.isoformat() if r.start_date else ""),
            sanitize_csv_cell(r.end_date.isoformat() if r.end_date else ""),
            sanitize_csv_cell(days),
            sanitize_csv_cell(r.reason or ""),
            sanitize_csv_cell(r.status.value if r.status else ""),
        ])

    csv_data = output.getvalue()
    filename = f"worksphere_leaves_{date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
