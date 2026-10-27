from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    link: Optional[str] = None,
    type: Optional[str] = None,
) -> Notification:
    """Helper to create a system notification for a specific user."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_user_notifications(
    db: Session,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[NotificationResponse], int]:
    """Retrieve notifications belonging strictly to the authenticated user."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    return [NotificationResponse.model_validate(n) for n in items], total


def get_unread_count(db: Session, user_id: int) -> int:
    """Count unread notifications for a user."""
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read.is_(False)).count()


def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> NotificationResponse:
    """Mark a single notification as read if owned by the user."""
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationResponse.model_validate(notif)


def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all notifications of a user as read."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return updated


def delete_notification(db: Session, notification_id: int, user_id: int) -> dict:
    """Delete a user notification."""
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}

