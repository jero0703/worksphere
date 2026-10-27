from sqlalchemy import Column, Integer, Date, DateTime, Numeric, Boolean, ForeignKey, Enum as SQLEnum, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from enum import Enum

from app.db.base import Base


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    working_hours = Column(Numeric(5, 2), default=0.00, nullable=False)
    status = Column(
        SQLEnum(AttendanceStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=AttendanceStatus.PRESENT,
        nullable=False,
        index=True,
    )
    is_late = Column(Boolean, default=False, nullable=False)
    late_minutes = Column(Integer, default=0, nullable=False)
    is_early_departure = Column(Boolean, default=False, nullable=False)
    early_departure_minutes = Column(Integer, default=0, nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    overtime_hours = Column(Numeric(5, 2), default=0.00, nullable=False)
    notes = Column(Text, nullable=True)
    correction_notes = Column(Text, nullable=True)
    corrected_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    corrected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_attendance_employee_date"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="attendances")
    corrector = relationship("User", foreign_keys=[corrected_by])
    shift = relationship("Shift", back_populates="attendances")
