from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class EmployeeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    employee_code = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    joining_date = Column(Date, nullable=False)
    salary = Column(Numeric(12, 2), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    status = Column(
        SQLEnum(EmployeeStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=EmployeeStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leaves = relationship("Leave", back_populates="employee", cascade="all, delete-orphan")
    leave_balances = relationship("LeaveBalance", back_populates="employee", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="employee", cascade="all, delete-orphan")
    employee_shifts = relationship("EmployeeShift", back_populates="employee", cascade="all, delete-orphan", order_by="desc(EmployeeShift.effective_from)")
    documents = relationship("Document", back_populates="employee", cascade="all, delete-orphan", order_by="desc(Document.uploaded_at)")
    performances = relationship("Performance", back_populates="employee", cascade="all, delete-orphan", order_by="desc(Performance.created_at)")
    onboarding_tasks = relationship("OnboardingTask", back_populates="employee", cascade="all, delete-orphan", order_by="asc(OnboardingTask.due_date)")
    resignations = relationship("Resignation", back_populates="employee", cascade="all, delete-orphan", order_by="desc(Resignation.created_at)")
    tasks = relationship("InternalTask", back_populates="employee", cascade="all, delete-orphan", order_by="asc(InternalTask.due_date)")
    feedbacks = relationship("Feedback", back_populates="employee", cascade="all, delete-orphan")
