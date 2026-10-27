from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, Enum as SQLEnum, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class PayrollStatus(str, Enum):
    PAID = "PAID"
    PENDING = "PENDING"


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    basic_salary = Column(Numeric(12, 2), nullable=False)
    allowances = Column(Numeric(12, 2), default=0.00, nullable=False)
    deductions = Column(Numeric(12, 2), default=0.00, nullable=False)
    bonus = Column(Numeric(12, 2), default=0.00, nullable=False)
    net_salary = Column(Numeric(12, 2), nullable=False)
    month = Column(String(7), nullable=False, index=True)  # Format: "YYYY-MM"
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String(50), default="Direct Deposit", nullable=False)
    status = Column(
        SQLEnum(PayrollStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=PayrollStatus.PAID,
        nullable=False,
    )
    notes = Column(Text, nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "month", name="uq_payroll_employee_month"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="payrolls")
    generator = relationship("User", foreign_keys=[generated_by])
