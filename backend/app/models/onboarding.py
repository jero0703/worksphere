from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class OnboardingStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


class OnboardingTask(Base):
    __tablename__ = "onboarding"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    status = Column(
        SQLEnum(OnboardingStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=OnboardingStatus.PENDING,
        nullable=False,
        index=True,
    )
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="onboarding_tasks")
