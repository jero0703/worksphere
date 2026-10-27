from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin, verify_employee_ownership
from app.schemas.employee import EmployeeSearchResponse
from app.services import employee_service

router = APIRouter(prefix="/employees", tags=["Employee Directory & Search"])


@router.get("/search", response_model=EmployeeSearchResponse)
def search_employees(
    q: Optional[str] = Query(None, description="Search by name, code, department, designation, phone, or email"),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    has_shift: Optional[bool] = Query(None),
    min_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    attendance_status: Optional[str] = Query(None),
    sort_by: str = Query("full_name", pattern="^(full_name|joining_date|salary|department|employee_code)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Advanced multi-field search and filtering across all employee records with shift, attendance, and performance insights. (HR / Admin only)
    """
    return employee_service.search_employees(
        db=db,
        q=q,
        department=department,
        status=status,
        role=role,
        has_shift=has_shift,
        min_rating=min_rating,
        attendance_status=attendance_status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{employee_id}/profile")
def get_employee_profile(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get full employee 360-degree profile (documents, performance reviews, attendance, assigned shift).
    """
    verify_employee_ownership(current_user, employee_id)
    return employee_service.get_employee_full_profile(db=db, employee_id=employee_id)
