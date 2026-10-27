import io
import csv
from datetime import date, timedelta, datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.employee import Employee, EmployeeStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import Leave, LeaveStatus
from app.models.performance import Performance
from app.models.payroll import Payroll
from app.models.shift import Shift, EmployeeShift
from app.models.document import Document


def get_analytics_dashboard_data(
    db: Session,
    department: Optional[str] = None,
    days: int = 30,
) -> Dict[str, Any]:
    today = date.today()
    start_date = today - timedelta(days=days)

    # Base employee filter
    emp_query = db.query(Employee)
    if department:
        emp_query = emp_query.filter(Employee.department == department)
    employees = emp_query.all()
    emp_ids = [e.id for e in employees]

    total_employees = len(employees)
    active_employees = sum(1 for e in employees if e.status == EmployeeStatus.ACTIVE)

    # 1. Department Breakdown
    dept_query = db.query(
        Employee.department,
        func.count(Employee.id).label("headcount"),
        func.coalesce(func.sum(Employee.salary), 0).label("total_salary"),
        func.coalesce(func.avg(Employee.salary), 0).label("avg_salary"),
    ).filter(Employee.status == EmployeeStatus.ACTIVE)
    if department:
        dept_query = dept_query.filter(Employee.department == department)
    dept_rows = dept_query.group_by(Employee.department).all()

    department_metrics = []
    for row in dept_rows:
        dept_name, count, total_sal, avg_sal = row
        department_metrics.append({
            "department": dept_name,
            "headcount": count,
            "total_salary": float(total_sal),
            "average_salary": round(float(avg_sal), 2),
        })

    # 2. Attendance Trends (Daily over period)
    att_query = db.query(
        Attendance.date,
        Attendance.status,
        Attendance.is_late,
        func.count(Attendance.id).label("count"),
        func.coalesce(func.sum(Attendance.working_hours), 0).label("total_hours"),
        func.coalesce(func.sum(Attendance.overtime_hours), 0).label("total_overtime"),
    ).filter(
        Attendance.date >= start_date,
        Attendance.date <= today,
    )
    if emp_ids:
        att_query = att_query.filter(Attendance.employee_id.in_(emp_ids))
    else:
        att_query = att_query.filter(Attendance.employee_id == -1)

    att_rows = att_query.group_by(Attendance.date, Attendance.status, Attendance.is_late).all()

    # Aggregate daily
    daily_map = {}
    curr = start_date
    while curr <= today:
        d_str = curr.isoformat()
        daily_map[d_str] = {
            "date": d_str,
            "present": 0,
            "late": 0,
            "absent": 0,
            "half_day": 0,
            "on_leave": 0,
            "overtime_hours": 0.0,
        }
        curr += timedelta(days=1)

    total_present_records = 0
    total_late_records = 0
    total_absent_records = 0
    total_overtime_hours = 0.0

    for att_date, status, is_late, count, hours, overtime in att_rows:
        d_str = att_date.isoformat()
        if d_str in daily_map:
            if status == AttendanceStatus.PRESENT or status == "PRESENT":
                if is_late:
                    daily_map[d_str]["late"] += count
                    total_late_records += count
                else:
                    daily_map[d_str]["present"] += count
                total_present_records += count
            elif status == AttendanceStatus.ABSENT or status == "ABSENT":
                daily_map[d_str]["absent"] += count
                total_absent_records += count
            elif status == AttendanceStatus.HALF_DAY or status == "HALF_DAY":
                daily_map[d_str]["half_day"] += count
                total_present_records += count
            elif status == AttendanceStatus.ON_LEAVE or status == "ON_LEAVE":
                daily_map[d_str]["on_leave"] += count

            daily_map[d_str]["overtime_hours"] += float(overtime)
            total_overtime_hours += float(overtime)

    attendance_trends = list(daily_map.values())
    total_logged_days = total_present_records + total_absent_records
    attendance_rate = round((total_present_records / total_logged_days * 100), 1) if total_logged_days > 0 else 100.0

    # 3. Leave Trends & Distribution
    leave_query = db.query(Leave)
    if emp_ids:
        leave_query = leave_query.filter(Leave.employee_id.in_(emp_ids))
    else:
        leave_query = leave_query.filter(Leave.employee_id == -1)
    leaves = leave_query.all()

    leave_by_status = {"PENDING": 0, "APPROVED": 0, "REJECTED": 0, "CANCELLED": 0}
    leave_by_type = {}
    for lv in leaves:
        st = lv.status.value if hasattr(lv.status, "value") else str(lv.status)
        leave_by_status[st] = leave_by_status.get(st, 0) + 1

        t = lv.leave_type or "CASUAL"
        leave_by_type[t] = leave_by_type.get(t, 0) + 1

    leave_distribution = [{"type": k, "count": v} for k, v in leave_by_type.items()]

    # 4. Performance Metrics
    perf_query = db.query(Performance)
    if emp_ids:
        perf_query = perf_query.filter(Performance.employee_id.in_(emp_ids))
    else:
        perf_query = perf_query.filter(Performance.employee_id == -1)
    perfs = perf_query.all()

    avg_performance = round(sum(float(p.rating) for p in perfs) / len(perfs), 2) if perfs else 0.0
    perf_distribution = {"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0}
    for p in perfs:
        r = float(p.rating)
        if r >= 4.5:
            perf_distribution["5_star"] += 1
        elif r >= 3.5:
            perf_distribution["4_star"] += 1
        elif r >= 2.5:
            perf_distribution["3_star"] += 1
        elif r >= 1.5:
            perf_distribution["2_star"] += 1
        else:
            perf_distribution["1_star"] += 1

    # 5. Shift & Operational Stats
    shift_assignments_count = db.query(EmployeeShift).filter(
        EmployeeShift.effective_to.is_(None) | (EmployeeShift.effective_to >= today)
    ).count()
    total_documents_count = db.query(Document).count()

    return {
        "summary": {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "attendance_rate": attendance_rate,
            "total_overtime_hours": round(total_overtime_hours, 1),
            "average_performance": avg_performance,
            "active_shifts_count": shift_assignments_count,
            "documents_stored": total_documents_count,
            "pending_leaves_count": leave_by_status.get("PENDING", 0),
        },
        "attendance_trends": attendance_trends,
        "department_metrics": department_metrics,
        "leave_by_status": leave_by_status,
        "leave_distribution": leave_distribution,
        "performance_distribution": perf_distribution,
    }


def generate_attendance_csv(
    db: Session,
    department: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> io.StringIO:
    query = db.query(Attendance, Employee).join(Employee, Attendance.employee_id == Employee.id)
    if department:
        query = query.filter(Employee.department == department)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(desc(Attendance.date)).all()

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
        "Status",
        "Is Late",
        "Early Departure",
        "Working Hours",
        "Overtime Hours",
    ])

    for att, emp in records:
        writer.writerow([
            att.id,
            emp.employee_code,
            emp.full_name,
            emp.department,
            att.date.isoformat(),
            att.check_in.strftime("%H:%M:%S") if att.check_in else "-",
            att.check_out.strftime("%H:%M:%S") if att.check_out else "-",
            att.status.value if hasattr(att.status, "value") else str(att.status),
            "Yes" if att.is_late else "No",
            "Yes" if getattr(att, "early_departure", False) else "No",
            float(att.working_hours or 0),
            float(att.overtime_hours or 0),
        ])

    output.seek(0)
    return output


def generate_leaves_csv(
    db: Session,
    department: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> io.StringIO:
    query = db.query(Leave, Employee).join(Employee, Leave.employee_id == Employee.id)
    if department:
        query = query.filter(Employee.department == department)
    if start_date:
        query = query.filter(Leave.start_date >= start_date)
    if end_date:
        query = query.filter(Leave.end_date <= end_date)

    records = query.order_by(desc(Leave.created_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Leave ID",
        "Employee Code",
        "Employee Name",
        "Department",
        "Leave Type",
        "Start Date",
        "End Date",
        "Total Days",
        "Status",
        "Reason",
        "Created At",
    ])

    for lv, emp in records:
        days = (lv.end_date - lv.start_date).days + 1 if lv.start_date and lv.end_date else 0
        writer.writerow([
            lv.id,
            emp.employee_code,
            emp.full_name,
            emp.department,
            lv.leave_type,
            lv.start_date.isoformat(),
            lv.end_date.isoformat(),
            days,
            lv.status.value if hasattr(lv.status, "value") else str(lv.status),
            lv.reason or "",
            lv.created_at.strftime("%Y-%m-%d %H:%M") if lv.created_at else "",
        ])

    output.seek(0)
    return output


def generate_payroll_csv(
    db: Session,
    month: Optional[str] = None,
) -> io.StringIO:
    query = db.query(Payroll, Employee).join(Employee, Payroll.employee_id == Employee.id)
    if month:
        query = query.filter(Payroll.month.like(f"{month}%"))

    records = query.order_by(desc(Payroll.month)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Payroll ID",
        "Employee Code",
        "Employee Name",
        "Department",
        "Month (YYYY-MM)",
        "Basic Salary",
        "Allowances",
        "Deductions",
        "Net Salary",
        "Status",
        "Payment Date",
    ])

    for pay, emp in records:
        writer.writerow([
            pay.id,
            emp.employee_code,
            emp.full_name,
            emp.department,
            pay.month,
            float(pay.basic_salary),
            float(pay.allowances),
            float(pay.deductions),
            float(pay.net_salary),
            pay.status.value if hasattr(pay.status, "value") else str(pay.status),
            pay.payment_date.isoformat() if pay.payment_date else "-",
        ])

    output.seek(0)
    return output
