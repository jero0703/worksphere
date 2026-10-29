from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.feedback import Feedback, FeedbackStatus
from app.models.notification import Notification
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackStatusUpdate,
    FeedbackResponse,
    FeedbackMetricsResponse,
)
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin

router = APIRouter(prefix="/feedback", tags=["Employee Feedback"])


def _to_response(fb: Feedback, viewer: User) -> FeedbackResponse:
    is_owner = (fb.user_id == viewer.id) or (viewer.employee and fb.employee_id == viewer.employee.id)

    if fb.is_anonymous and not is_owner:
        submitter_display = "Anonymous Contributor"
        department_display = "Confidential"
    else:
        if fb.employee:
            submitter_display = f"{fb.employee.full_name} ({fb.employee.employee_code})"
            department_display = fb.employee.department
        elif fb.user:
            submitter_display = fb.user.username
            department_display = "General"
        else:
            submitter_display = "Anonymous Contributor"
            department_display = "Confidential"

    return FeedbackResponse(
        id=fb.id,
        category=fb.category,
        rating=fb.rating,
        message=fb.message,
        is_anonymous=fb.is_anonymous,
        status=fb.status,
        hr_response=fb.hr_response,
        created_at=fb.created_at,
        updated_at=fb.updated_at,
        submitter_display=submitter_display,
        department_display=department_display,
    )


@router.get("", response_model=List[FeedbackResponse], summary="List feedback records")
def list_feedback(
    category: Optional[str] = Query(None, description="Filter by category"),
    rating: Optional[int] = Query(None, ge=1, le=5, description="Filter by rating"),
    status_filter: Optional[FeedbackStatus] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Feedback)

    if current_user.role == UserRole.EMPLOYEE:
        # Employees only view their own feedback submissions
        query = query.filter(Feedback.user_id == current_user.id)
    else:
        if category:
            query = query.filter(Feedback.category == category)
        if rating:
            query = query.filter(Feedback.rating == rating)
        if status_filter:
            query = query.filter(Feedback.status == status_filter)

    feedbacks = query.order_by(Feedback.created_at.desc()).all()
    return [_to_response(fb, current_user) for fb in feedbacks]


@router.get("/metrics", response_model=FeedbackMetricsResponse, summary="Get feedback metrics and ratings breakdown (HR/Admin)")
def get_feedback_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    all_fb = db.query(Feedback).all()
    total = len(all_fb)

    rating_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    cat_counts: Dict[str, int] = {}
    total_rating_sum = 0

    for fb in all_fb:
        total_rating_sum += fb.rating
        rating_counts[fb.rating] = rating_counts.get(fb.rating, 0) + 1
        cat_counts[fb.category] = cat_counts.get(fb.category, 0) + 1

    avg_rating = round(total_rating_sum / total, 2) if total > 0 else 0.0

    return FeedbackMetricsResponse(
        total_feedbacks=total,
        average_rating=avg_rating,
        rating_breakdown=rating_counts,
        category_breakdown=cat_counts,
    )


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit employee feedback")
def submit_feedback(
    req: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    emp_id = current_user.employee.id if current_user.employee else None

    fb = Feedback(
        employee_id=emp_id,
        user_id=current_user.id,
        category=req.category.strip(),
        rating=req.rating,
        message=req.message.strip(),
        is_anonymous=req.is_anonymous,
        status=FeedbackStatus.NEW,
    )
    db.add(fb)
    db.flush()

    # Notify HR
    hr_users = db.query(User).filter(User.role.in_([UserRole.HR, UserRole.ADMIN]), User.is_active == True).all()
    for hr_u in hr_users:
        db.add(Notification(
            user_id=hr_u.id,
            title="New Employee Feedback Received",
            message=f"Category: {fb.category} | Rating: {fb.rating}/5 stars | {'Anonymous' if fb.is_anonymous else 'Named'}.",
        ))

    db.commit()
    db.refresh(fb)
    return _to_response(fb, current_user)


@router.patch("/{feedback_id}/status", response_model=FeedbackResponse, summary="Respond to or acknowledge feedback (HR/Admin)")
def respond_feedback(
    feedback_id: int,
    req: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback record not found")

    fb.status = req.status
    if req.hr_response is not None:
        fb.hr_response = req.hr_response.strip()

    # If the feedback was submitted by an identified user, notify them of response
    if fb.user_id and not fb.is_anonymous and fb.hr_response:
        db.add(Notification(
            user_id=fb.user_id,
            title="HR Responded to Your Feedback",
            message=f"Category: {fb.category}. Response: {fb.hr_response[:120]}...",
        ))

    db.commit()
    db.refresh(fb)
    return _to_response(fb, current_user)
