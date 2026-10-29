from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class FeedbackStatus(str, Enum):
    NEW = "NEW"
    REVIEWED = "REVIEWED"
    ACKNOWLEDGED = "ACKNOWLEDGED"


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1 to 5
    message = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    status = Column(
        SQLEnum(FeedbackStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=FeedbackStatus.NEW,
        nullable=False,
        index=True,
    )
    hr_response = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="feedbacks")
    user = relationship("User", foreign_keys=[user_id])
