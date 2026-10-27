from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.dependencies.permissions import require_hr_or_admin
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])


@router.get("/dashboard")
def get_analytics_dashboard(
    department: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Get executive HR analytics metrics, attendance trends, leave distributions, and department breakdowns.
    """
    return analytics_service.get_analytics_dashboard_data(
        db=db,
        department=department,
        days=days,
    )


@router.get("/export/attendance")
def export_attendance_csv(
    department: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Export attendance records as CSV.
    """
    csv_buffer = analytics_service.generate_attendance_csv(
        db=db,
        department=department,
        start_date=start_date,
        end_date=end_date,
    )
    filename = f"worksphere_attendance_{date.today().isoformat()}.csv"
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/leaves")
def export_leaves_csv(
    department: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Export leave applications as CSV.
    """
    csv_buffer = analytics_service.generate_leaves_csv(
        db=db,
        department=department,
        start_date=start_date,
        end_date=end_date,
    )
    filename = f"worksphere_leaves_{date.today().isoformat()}.csv"
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/payroll")
def export_payroll_csv(
    month: Optional[str] = Query(None, description="Month filter (e.g. 2026-03 or 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Export payroll records as CSV.
    """
    csv_buffer = analytics_service.generate_payroll_csv(
        db=db,
        month=month,
    )
    filename = f"worksphere_payroll_{date.today().isoformat()}.csv"
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
