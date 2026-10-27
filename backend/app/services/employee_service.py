from datetime import date
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from fastapi import HTTPException, status

from app.models.employee import Employee, EmployeeStatus
from app.models.user import User, UserRole
from app.models.attendance import Attendance
from app.models.leave import Leave
from app.models.shift import Shift, EmployeeShift
from app.models.document import Document
from app.models.performance import Performance
from app.schemas.employee import (
    EmployeeSearchResponse,
    EmployeeSearchItem,
    EmployeeShiftSummary,
    EmployeePerformanceSummary,
    EmployeeAttendanceSummary,
)


def search_employees(
    db: Session,
    q: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,
    has_shift: Optional[bool] = None,
    min_rating: Optional[float] = None,
    attendance_status: Optional[str] = None,
    sort_by: str = "full_name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> EmployeeSearchResponse:
    today = date.today()

    query = db.query(Employee).outerjoin(User, Employee.user_id == User.id)

    # 1. Text Search across multiple fields
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(term),
                Employee.employee_code.ilike(term),
                Employee.department.ilike(term),
                Employee.designation.ilike(term),
                Employee.phone.ilike(term),
                User.email.ilike(term),
                User.username.ilike(term),
            )
        )

    # 2. Department filter
    if department and department.strip():
        query = query.filter(Employee.department == department.strip())

    # 3. Status filter
    if status and status.strip():
        query = query.filter(Employee.status == status.strip().upper())

    # 4. Role filter
    if role and role.strip():
        query = query.filter(User.role == role.strip().upper())

    # 5. Shift Assignment filter
    if has_shift is not None:
        shift_emp_subquery = db.query(EmployeeShift.employee_id).filter(
            EmployeeShift.effective_from <= today,
            or_(
                EmployeeShift.effective_to.is_(None),
                EmployeeShift.effective_to >= today,
            ),
        ).subquery()

        if has_shift:
            query = query.filter(Employee.id.in_(shift_emp_subquery))
        else:
            query = query.filter(Employee.id.notin_(shift_emp_subquery))

    # 6. Minimum Performance Rating filter
    if min_rating is not None and min_rating > 0:
        rated_emp_subquery = db.query(Performance.employee_id).filter(
            Performance.rating >= min_rating
        ).subquery()
        query = query.filter(Employee.id.in_(rated_emp_subquery))

    # 7. Today's Attendance Status filter
    if attendance_status and attendance_status.strip():
        att_subquery = db.query(Attendance.employee_id).filter(
            Attendance.date == today,
            Attendance.status == attendance_status.strip().upper(),
        ).subquery()
        query = query.filter(Employee.id.in_(att_subquery))

    # Sorting
    sort_column_map = {
        "full_name": Employee.full_name,
        "joining_date": Employee.joining_date,
        "salary": Employee.salary,
        "department": Employee.department,
        "employee_code": Employee.employee_code,
    }
    col = sort_column_map.get(sort_by, Employee.full_name)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(col))
    else:
        query = query.order_by(asc(col))

    total = query.count()
    offset = (page - 1) * page_size
    employees = query.offset(offset).limit(page_size).all()

    # Preload related data for retrieved batch
    emp_ids = [e.id for e in employees]

    # Preload active shifts
    active_shifts = {}
    if emp_ids:
        shift_records = (
            db.query(EmployeeShift, Shift)
            .join(Shift, EmployeeShift.shift_id == Shift.id)
            .filter(
                EmployeeShift.employee_id.in_(emp_ids),
                EmployeeShift.effective_from <= today,
                or_(
                    EmployeeShift.effective_to.is_(None),
                    EmployeeShift.effective_to >= today,
                ),
            )
            .all()
        )
        for es, s in shift_records:
            if es.employee_id not in active_shifts:
                active_shifts[es.employee_id] = EmployeeShiftSummary(
                    id=s.id,
                    name=s.name,
                    start_time=s.start_time.strftime("%H:%M"),
                    end_time=s.end_time.strftime("%H:%M"),
                    effective_from=es.effective_from,
                )

    # Preload today's attendance
    today_attendances = {}
    if emp_ids:
        att_records = db.query(Attendance).filter(
            Attendance.employee_id.in_(emp_ids),
            Attendance.date == today,
        ).all()
        for a in att_records:
            today_attendances[a.employee_id] = EmployeeAttendanceSummary(
                date=a.date.isoformat(),
                status=a.status.value if hasattr(a.status, "value") else str(a.status),
                is_late=bool(a.is_late),
                check_in=a.check_in.strftime("%H:%M:%S") if a.check_in else None,
                check_out=a.check_out.strftime("%H:%M:%S") if a.check_out else None,
            )

    # Preload latest performance review
    latest_perfs = {}
    if emp_ids:
        perf_records = (
            db.query(Performance)
            .filter(Performance.employee_id.in_(emp_ids))
            .order_by(desc(Performance.created_at))
            .all()
        )
        for p in perf_records:
            if p.employee_id not in latest_perfs:
                latest_perfs[p.employee_id] = EmployeePerformanceSummary(
                    id=p.id,
                    review_period=p.review_period,
                    rating=float(p.rating),
                    feedback=p.feedback[:80] + "..." if p.feedback and len(p.feedback) > 80 else p.feedback,
                )

    # Preload document count
    doc_counts = {}
    if emp_ids:
        counts = (
            db.query(Document.employee_id, func.count(Document.id))
            .filter(Document.employee_id.in_(emp_ids))
            .group_by(Document.employee_id)
            .all()
        )
        for eid, cnt in counts:
            doc_counts[eid] = cnt

    items = []
    for emp in employees:
        user = emp.user
        items.append(
            EmployeeSearchItem(
                id=emp.id,
                employee_code=emp.employee_code,
                full_name=emp.full_name,
                designation=emp.designation,
                department=emp.department,
                joining_date=emp.joining_date,
                salary=float(emp.salary),
                phone=emp.phone,
                status=emp.status.value if hasattr(emp.status, "value") else str(emp.status),
                user_id=emp.user_id,
                email=user.email if user else None,
                role=user.role.value if (user and hasattr(user.role, "value")) else (str(user.role) if user else None),
                current_shift=active_shifts.get(emp.id),
                latest_performance=latest_perfs.get(emp.id),
                today_attendance=today_attendances.get(emp.id),
                documents_count=doc_counts.get(emp.id, 0),
            )
        )

    # Get distinct departments and designations for filter pills
    distinct_depts = [r[0] for r in db.query(Employee.department).distinct().filter(Employee.department.isnot(None)).all()]
    distinct_desigs = [r[0] for r in db.query(Employee.designation).distinct().filter(Employee.designation.isnot(None)).all()]

    total_pages = max(1, (total + page_size - 1) // page_size)

    return EmployeeSearchResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        departments=sorted(distinct_depts),
        designations=sorted(distinct_desigs),
    )


def get_employee_full_profile(db: Session, employee_id: int) -> Dict[str, Any]:
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = emp.user
    today = date.today()

    # Active shift
    active_shift = (
        db.query(EmployeeShift, Shift)
        .join(Shift, EmployeeShift.shift_id == Shift.id)
        .filter(
            EmployeeShift.employee_id == emp.id,
            EmployeeShift.effective_from <= today,
            or_(
                EmployeeShift.effective_to.is_(None),
                EmployeeShift.effective_to >= today,
            ),
        )
        .first()
    )

    shift_info = None
    if active_shift:
        es, s = active_shift
        shift_info = {
            "id": s.id,
            "name": s.name,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "effective_from": es.effective_from.isoformat() if es.effective_from else None,
        }

    # Recent attendances (last 7)
    recent_att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == emp.id)
        .order_by(desc(Attendance.date))
        .limit(7)
        .all()
    )

    # Documents
    docs = db.query(Document).filter(Document.employee_id == emp.id).order_by(desc(Document.uploaded_at)).all()

    # Performance reviews
    perfs = db.query(Performance).filter(Performance.employee_id == emp.id).order_by(desc(Performance.created_at)).all()

    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "full_name": emp.full_name,
        "designation": emp.designation,
        "department": emp.department,
        "joining_date": emp.joining_date.isoformat(),
        "salary": float(emp.salary),
        "phone": emp.phone,
        "status": emp.status.value if hasattr(emp.status, "value") else str(emp.status),
        "user_id": emp.user_id,
        "email": user.email if user else None,
        "role": user.role.value if (user and hasattr(user.role, "value")) else (str(user.role) if user else None),
        "is_user_active": user.is_active if user else False,
        "current_shift": shift_info,
        "recent_attendance": [
            {
                "id": a.id,
                "date": a.date.isoformat(),
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "is_late": bool(a.is_late),
                "working_hours": float(a.working_hours or 0),
            }
            for a in recent_att
        ],
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_size": d.file_size,
                "document_type": d.document_type,
                "uploaded_at": d.uploaded_at.isoformat(),
                "download_url": f"/api/documents/{d.id}/download",
            }
            for d in docs
        ],
        "performances": [
            {
                "id": p.id,
                "review_period": p.review_period,
                "rating": float(p.rating),
                "feedback": p.feedback,
                "created_at": p.created_at.isoformat(),
            }
            for p in perfs
        ],
    }
