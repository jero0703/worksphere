from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin
from app.schemas.performance import (
    PerformanceCreate,
    PerformanceUpdate,
    PerformanceResponse,
    PerformanceSummary,
)
from app.services import performance_service

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.post("", response_model=PerformanceResponse, status_code=status.HTTP_201_CREATED)
def create_performance_review(
    data: PerformanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Submit a performance review for an employee. (HR / Admin only)
    """
    review = performance_service.create_review(
        db=db,
        current_user=current_user,
        data=data,
    )
    return performance_service.get_review_by_id(db, current_user, review.id)


@router.get("", response_model=List[PerformanceResponse])
def list_performance_reviews(
    employee_id: Optional[int] = Query(None),
    review_period: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List performance reviews. Employees can only see their own reviews; HR and Admin can see all.
    """
    return performance_service.get_reviews(
        db=db,
        current_user=current_user,
        employee_id=employee_id,
        review_period=review_period,
        department=department,
    )


@router.get("/summary", response_model=PerformanceSummary)
def get_performance_summary(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get aggregated performance metrics (average rating, distribution, top performers count).
    """
    return performance_service.get_performance_summary(
        db=db,
        current_user=current_user,
        department=department,
    )


@router.get("/{review_id}", response_model=PerformanceResponse)
def get_performance_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get details of a specific performance review.
    """
    return performance_service.get_review_by_id(
        db=db,
        current_user=current_user,
        review_id=review_id,
    )


@router.put("/{review_id}", response_model=PerformanceResponse)
def update_performance_review(
    review_id: int,
    data: PerformanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Update a performance review. (HR / Admin only)
    """
    return performance_service.update_review(
        db=db,
        current_user=current_user,
        review_id=review_id,
        data=data,
    )


@router.delete("/{review_id}")
def delete_performance_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    """
    Delete a performance review. (HR / Admin only)
    """
    return performance_service.delete_review(
        db=db,
        current_user=current_user,
        review_id=review_id,
    )
