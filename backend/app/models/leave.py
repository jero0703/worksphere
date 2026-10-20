from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, Enum as SQLEnum, Text, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class LeaveType(str, Enum):
    SICK = "SICK"
    CASUAL = "CASUAL"
    PAID = "PAID"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(
        SQLEnum(LeaveType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(
        SQLEnum(LeaveStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=LeaveStatus.PENDING,
        nullable=False,
        index=True,
    )
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leaves")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
