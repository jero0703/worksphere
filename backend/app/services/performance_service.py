from decimal import Decimal
from typing import List, Optional, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.performance import Performance
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.performance import PerformanceCreate, PerformanceUpdate, PerformanceSummary
from app.services.notification_service import create_notification


def create_review(
    db: Session,
    current_user: User,
    data: PerformanceCreate,
) -> Performance:
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR and Admin personnel can submit performance reviews.",
        )

    employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {data.employee_id} not found.",
        )

    # Format rating to 1 decimal place
    clean_rating = round(Decimal(str(data.rating)), 1)
    if clean_rating < Decimal("1.0") or clean_rating > Decimal("5.0"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Performance rating must be between 1.0 and 5.0.",
        )

    review = Performance(
        employee_id=data.employee_id,
        review_period=data.review_period.strip(),
        rating=clean_rating,
        feedback=data.feedback.strip(),
        goals=data.goals.strip() if data.goals else None,
        reviewer_id=current_user.id,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Send Smart Notification if employee has a user account
    if employee.user_id:
        create_notification(
            db=db,
            user_id=employee.user_id,
            title="Performance Review Published",
            message=f"A new performance review for '{review.review_period}' has been published with rating {clean_rating}/5.0.",
            type="PERFORMANCE",
        )

    return review


def get_reviews(
    db: Session,
    current_user: User,
    employee_id: Optional[int] = None,
    review_period: Optional[str] = None,
    department: Optional[str] = None,
) -> List[dict]:
    query = db.query(Performance, Employee, User).join(
        Employee, Performance.employee_id == Employee.id
    ).outerjoin(
        User, Performance.reviewer_id == User.id
    )

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Performance.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Performance.employee_id == employee_id)

    if department:
        query = query.filter(Employee.department == department)

    if review_period:
        query = query.filter(Performance.review_period == review_period)

    records = query.order_by(desc(Performance.created_at)).all()

    reviews_out = []
    for perf, emp, reviewer in records:
        reviews_out.append({
            "id": perf.id,
            "employee_id": perf.employee_id,
            "employee_name": emp.full_name if emp else None,
            "employee_code": emp.employee_code if emp else None,
            "department": emp.department if emp else None,
            "designation": emp.designation if emp else None,
            "review_period": perf.review_period,
            "rating": float(perf.rating),
            "feedback": perf.feedback,
            "goals": perf.goals,
            "reviewer_id": perf.reviewer_id,
            "reviewer_name": (reviewer.employee.full_name if (reviewer and reviewer.employee) else (reviewer.username if reviewer else "Management")),
            "created_at": perf.created_at,
            "updated_at": perf.updated_at,
        })
    return reviews_out


def get_review_by_id(db: Session, current_user: User, review_id: int) -> dict:
    item = db.query(Performance, Employee, User).join(
        Employee, Performance.employee_id == Employee.id
    ).outerjoin(
        User, Performance.reviewer_id == User.id
    ).filter(Performance.id == review_id).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance review not found.")

    perf, emp, reviewer = item
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or perf.employee_id != current_user.employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this performance review.",
            )

    return {
        "id": perf.id,
        "employee_id": perf.employee_id,
        "employee_name": emp.full_name if emp else None,
        "employee_code": emp.employee_code if emp else None,
        "department": emp.department if emp else None,
        "designation": emp.designation if emp else None,
        "review_period": perf.review_period,
        "rating": float(perf.rating),
        "feedback": perf.feedback,
        "goals": perf.goals,
        "reviewer_id": perf.reviewer_id,
        "reviewer_name": (reviewer.employee.full_name if (reviewer and reviewer.employee) else (reviewer.username if reviewer else "Management")),
        "created_at": perf.created_at,
        "updated_at": perf.updated_at,
    }


def update_review(
    db: Session,
    current_user: User,
    review_id: int,
    data: PerformanceUpdate,
) -> dict:
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR and Admin personnel can modify performance reviews.",
        )

    review = db.query(Performance).filter(Performance.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance review not found.")

    if data.review_period is not None:
        review.review_period = data.review_period.strip()
    if data.rating is not None:
        clean_rating = round(Decimal(str(data.rating)), 1)
        if clean_rating < Decimal("1.0") or clean_rating > Decimal("5.0"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1.0 and 5.0.")
        review.rating = clean_rating
    if data.feedback is not None:
        review.feedback = data.feedback.strip()
    if data.goals is not None:
        review.goals = data.goals.strip()

    review.reviewer_id = current_user.id
    db.commit()
    db.refresh(review)
    return get_review_by_id(db, current_user, review.id)


def delete_review(db: Session, current_user: User, review_id: int):
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR and Admin personnel can delete performance reviews.",
        )

    review = db.query(Performance).filter(Performance.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance review not found.")

    db.delete(review)
    db.commit()
    return {"message": "Performance review deleted successfully."}


def get_performance_summary(
    db: Session,
    current_user: User,
    department: Optional[str] = None,
) -> PerformanceSummary:
    query = db.query(Performance).join(Employee, Performance.employee_id == Employee.id)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return PerformanceSummary(
                total_reviews=0,
                average_rating=0.0,
                rating_distribution={"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0},
                top_performers_count=0,
            )
        query = query.filter(Performance.employee_id == current_user.employee.id)
    elif department:
        query = query.filter(Employee.department == department)

    reviews = query.all()
    total = len(reviews)
    if total == 0:
        return PerformanceSummary(
            total_reviews=0,
            average_rating=0.0,
            rating_distribution={"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0},
            top_performers_count=0,
        )

    ratings = [float(r.rating) for r in reviews]
    avg_rating = round(sum(ratings) / total, 2)

    dist = {"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0}
    for r in ratings:
        if r >= 4.5:
            dist["5_star"] += 1
        elif r >= 3.5:
            dist["4_star"] += 1
        elif r >= 2.5:
            dist["3_star"] += 1
        elif r >= 1.5:
            dist["2_star"] += 1
        else:
            dist["1_star"] += 1

    top_count = sum(1 for r in ratings if r >= 4.0)

    return PerformanceSummary(
        total_reviews=total,
        average_rating=avg_rating,
        rating_distribution=dist,
        top_performers_count=top_count,
    )
