from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.user_settings import UserSettings
from app.models.notification import Notification
from app.schemas.profile import (
    ProfileUpdateRequest,
    PasswordChangeRequest,
    UserSettingsResponse,
    UserSettingsUpdate,
    FullProfileResponse,
)
from app.core.security import verify_password, hash_password
from app.dependencies.auth import get_current_active_user

router = APIRouter(prefix="/profile", tags=["Profile & Settings Management"])


def _get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=FullProfileResponse, summary="Get full personal profile and settings")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    settings = _get_or_create_settings(db, current_user.id)
    emp = current_user.employee

    return FullProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        employee_id=emp.id if emp else None,
        employee_code=emp.employee_code if emp else None,
        full_name=emp.full_name if emp else None,
        designation=emp.designation if emp else None,
        department=emp.department if emp else None,
        joining_date=emp.joining_date if emp else None,
        salary=float(emp.salary) if emp and emp.salary is not None else None,
        phone=emp.phone if emp else None,
        address=emp.address if emp else None,
        emergency_contact=emp.emergency_contact if emp else None,
        settings=UserSettingsResponse.model_validate(settings),
    )


@router.put("", response_model=FullProfileResponse, summary="Update permitted personal contact and address details")
def update_profile(
    req: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    emp = current_user.employee
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee record associated with this user account to update contact information",
        )

    if req.phone is not None:
        emp.phone = req.phone.strip()
    if req.address is not None:
        emp.address = req.address.strip()
    if req.emergency_contact is not None:
        emp.emergency_contact = req.emergency_contact.strip()

    db.commit()
    db.refresh(emp)

    return get_profile(db=db, current_user=current_user)


@router.post("/change-password", summary="Securely change account password")
def change_password(
    req: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify current password
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password you entered is incorrect",
        )

    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new password must be different from your current password",
        )

    # Hash new password
    current_user.hashed_password = hash_password(req.new_password)

    db.add(Notification(
        user_id=current_user.id,
        title="Security Alert: Password Changed",
        message="Your account password was successfully updated.",
    ))

    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/settings", response_model=UserSettingsResponse, summary="Get notification preferences and display theme")
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    settings = _get_or_create_settings(db, current_user.id)
    return UserSettingsResponse.model_validate(settings)


@router.put("/settings", response_model=UserSettingsResponse, summary="Update notification preferences and display theme")
def update_user_settings(
    req: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    settings = _get_or_create_settings(db, current_user.id)

    if req.email_notifications is not None:
        settings.email_notifications = req.email_notifications
    if req.in_app_notifications is not None:
        settings.in_app_notifications = req.in_app_notifications
    if req.task_reminders is not None:
        settings.task_reminders = req.task_reminders
    if req.announcement_alerts is not None:
        settings.announcement_alerts = req.announcement_alerts
    if req.theme is not None:
        settings.theme = req.theme.strip()

    db.commit()
    db.refresh(settings)
    return UserSettingsResponse.model_validate(settings)
