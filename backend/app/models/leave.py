from sqlalchemy import Column, Integer, Date, DateTime, Numeric, Boolean, ForeignKey, Enum as SQLEnum, Text, UniqueConstraint, func
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
    CANCELLED = "CANCELLED"


class LeavePolicy(Base):
    __tablename__ = "leave_policies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    leave_type = Column(
        SQLEnum(LeaveType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        unique=True,
        nullable=False,
    )
    total_days_allowed = Column(Numeric(4, 1), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(
        SQLEnum(LeaveType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    remaining_days = Column(Numeric(4, 1), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type", name="uq_employee_leave_balance"),
    )

    # Relationship
    employee = relationship("Employee", back_populates="leave_balances")


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
    days_requested = Column(Numeric(4, 1), default=1.0, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(
        SQLEnum(LeaveStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=LeaveStatus.PENDING,
        nullable=False,
        index=True,
    )
    is_balance_deducted = Column(Boolean, default=False, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    cancelled_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leaves")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    canceller = relationship("User", foreign_keys=[cancelled_by])
