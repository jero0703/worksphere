from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr, require_admin, require_hr_or_admin
from app.schemas.dashboard import (
    EmployeeDashboardStats,
    HrDashboardStats,
    AdminDashboardStats,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboards & Analytics"])


@router.get(
    "/employee",
    response_model=EmployeeDashboardStats,
    summary="Get employee self-service dashboard data",
)
def get_employee_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not associated with an employee profile",
        )
    return dashboard_service.get_employee_dashboard(db, current_user.employee.id)


@router.get(
    "/hr",
    response_model=HrDashboardStats,
    summary="Get HR management dashboard analytics (HR/Admin)",
)
def get_hr_dashboard(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return dashboard_service.get_hr_dashboard(db)


@router.get(
    "/admin",
    response_model=AdminDashboardStats,
    summary="Get system administration dashboard analytics (Admin only)",
)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    return dashboard_service.get_admin_dashboard(db)
