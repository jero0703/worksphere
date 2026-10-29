from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.announcement import Announcement, AnnouncementPriority
from app.models.notification import Notification
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
)
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin

router = APIRouter(prefix="/announcements", tags=["Internal Announcements"])


def _to_response(ann: Announcement) -> AnnouncementResponse:
    author_name = ann.author.username if ann.author else "Management"
    if ann.author and ann.author.employee:
        author_name = ann.author.employee.full_name

    return AnnouncementResponse(
        id=ann.id,
        title=ann.title,
        message=ann.message,
        priority=ann.priority,
        created_by=ann.created_by,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
        author_name=author_name,
        author_role=ann.author.role.value if ann.author else None,
    )


@router.get("", response_model=List[AnnouncementResponse], summary="List all internal announcements")
def list_announcements(
    priority: Optional[AnnouncementPriority] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search in title or message"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Announcement)

    if priority:
        query = query.filter(Announcement.priority == priority)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (Announcement.title.ilike(pattern)) | (Announcement.message.ilike(pattern))
        )

    announcements = query.order_by(Announcement.created_at.desc()).all()
    return [_to_response(a) for a in announcements]


@router.get("/{announcement_id}", response_model=AnnouncementResponse, summary="Get announcement by ID")
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return _to_response(ann)


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED, summary="Create announcement (HR/Admin)")
def create_announcement(
    req: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    ann = Announcement(
        title=req.title.strip(),
        message=req.message.strip(),
        priority=req.priority or AnnouncementPriority.MEDIUM,
        created_by=current_user.id,
    )
    db.add(ann)
    db.flush()

    # If priority is HIGH or URGENT, broadcast notifications to all active users
    if ann.priority in (AnnouncementPriority.HIGH, AnnouncementPriority.URGENT):
        active_users = db.query(User).filter(User.is_active == True, User.id != current_user.id).all()
        for u in active_users:
            db.add(Notification(
                user_id=u.id,
                title=f"Announcement: {ann.title}",
                message=f"[{ann.priority.value}] {ann.message[:150]}...",
            ))

    db.commit()
    db.refresh(ann)
    return _to_response(ann)


@router.put("/{announcement_id}", response_model=AnnouncementResponse, summary="Update announcement (HR/Admin)")
def update_announcement(
    announcement_id: int,
    req: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    if req.title is not None:
        ann.title = req.title.strip()
    if req.message is not None:
        ann.message = req.message.strip()
    if req.priority is not None:
        ann.priority = req.priority

    db.commit()
    db.refresh(ann)
    return _to_response(ann)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete announcement (HR/Admin)")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    db.delete(ann)
    db.commit()
    return None
