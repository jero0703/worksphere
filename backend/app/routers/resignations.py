from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.resignation import Resignation, ResignationStatus
from app.models.notification import Notification
from app.schemas.resignation import (
    ResignationCreate,
    ResignationReviewRequest,
    ResignationResponse,
)
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin

router = APIRouter(prefix="/resignations", tags=["Resignation & Exit Management"])


def _to_response(resig: Resignation) -> ResignationResponse:
    last_day = None
    if resig.created_at and resig.notice_period:
        last_day = (resig.created_at + timedelta(days=resig.notice_period)).date()

    return ResignationResponse(
        id=resig.id,
        employee_id=resig.employee_id,
        reason=resig.reason,
        notice_period=resig.notice_period,
        status=resig.status,
        reviewed_by=resig.reviewed_by,
        reviewed_at=resig.reviewed_at,
        review_comment=resig.review_comment,
        created_at=resig.created_at,
        updated_at=resig.updated_at,
        employee_name=resig.employee.full_name if resig.employee else None,
        employee_code=resig.employee.employee_code if resig.employee else None,
        department=resig.employee.department if resig.employee else None,
        reviewer_name=resig.reviewer.username if resig.reviewer else None,
        expected_last_working_day=last_day,
    )


@router.get("", response_model=List[ResignationResponse], summary="List resignation requests")
def list_resignations(
    status_filter: Optional[ResignationStatus] = Query(None, alias="status", description="Filter by status"),
    employee_id: Optional[int] = Query(None, description="Filter by employee ID (HR/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Resignation)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Resignation.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Resignation.employee_id == employee_id)

    if status_filter:
        query = query.filter(Resignation.status == status_filter)

    records = query.order_by(Resignation.created_at.desc()).all()
    return [_to_response(r) for r in records]


@router.get("/{resignation_id}", response_model=ResignationResponse, summary="Get single resignation request")
def get_resignation(
    resignation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resig = db.query(Resignation).filter(Resignation.id == resignation_id).first()
    if not resig:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resignation record not found")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or resig.employee_id != current_user.employee.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden: you can only view your own resignation")

    return _to_response(resig)


@router.post("", response_model=ResignationResponse, status_code=status.HTTP_201_CREATED, summary="Submit resignation request")
def submit_resignation(
    req: ResignationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee profile associated with current user")

    # Check if there is an existing pending resignation
    pending = (
        db.query(Resignation)
        .filter(Resignation.employee_id == current_user.employee.id, Resignation.status == ResignationStatus.PENDING)
        .first()
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active pending resignation request under review.",
        )

    resig = Resignation(
        employee_id=current_user.employee.id,
        reason=req.reason.strip(),
        notice_period=req.notice_period,
        status=ResignationStatus.PENDING,
    )
    db.add(resig)
    db.flush()

    # Notify HR and Admin users
    hr_users = db.query(User).filter(User.role.in_([UserRole.HR, UserRole.ADMIN]), User.is_active == True).all()
    for hr_u in hr_users:
        db.add(Notification(
            user_id=hr_u.id,
            title="New Resignation Request",
            message=f"Employee {current_user.employee.full_name} ({current_user.employee.employee_code}) submitted a resignation request with {req.notice_period} days notice.",
        ))

    db.commit()
    db.refresh(resig)
    return _to_response(resig)


@router.patch("/{resignation_id}/review", response_model=ResignationResponse, summary="Review resignation (HR/Admin)")
def review_resignation(
    resignation_id: int,
    req: ResignationReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    if req.status not in (ResignationStatus.APPROVED, ResignationStatus.REJECTED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review status must be APPROVED or REJECTED")

    resig = db.query(Resignation).filter(Resignation.id == resignation_id).first()
    if not resig:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resignation record not found")

    if resig.status != ResignationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review resignation that is already in {resig.status.value} status",
        )

    resig.status = req.status
    resig.reviewed_by = current_user.id
    resig.reviewed_at = datetime.now(timezone.utc)
    resig.review_comment = req.review_comment.strip() if req.review_comment else None

    # CRITICAL: Do NOT automatically deactivate or delete the employee record when resignation is approved!
    # Instead, notify the employee of the outcome.
    if resig.employee and resig.employee.user_id:
        db.add(Notification(
            user_id=resig.employee.user_id,
            title=f"Resignation Request {req.status.value}",
            message=f"Your resignation request has been {req.status.value.lower()} by HR. Remarks: {resig.review_comment or 'No additional remarks'}.",
        ))

    db.commit()
    db.refresh(resig)
    return _to_response(resig)
