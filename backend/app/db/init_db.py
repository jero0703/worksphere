from datetime import date, time
from decimal import Decimal
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.database import engine, SessionLocal
from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.attendance import Attendance
from app.models.leave import Leave, LeavePolicy, LeaveBalance, LeaveType
from app.models.payroll import Payroll
from app.models.notification import Notification
from app.models.shift import Shift, EmployeeShift
from app.core.security import hash_password
from app.core.permissions import UserRole


def init_default_shifts(db: Session) -> None:
    """Ensure baseline organizational shifts exist and assign default shifts to employees."""
    shifts_data = [
        {"name": "Morning Shift", "start_time": time(9, 0), "end_time": time(17, 0), "description": "Standard day shift (09:00 - 17:00)"},
        {"name": "Evening Shift", "start_time": time(16, 0), "end_time": time(0, 0), "description": "Afternoon & evening shift (16:00 - 00:00)"},
        {"name": "Night Shift", "start_time": time(22, 0), "end_time": time(6, 0), "description": "Overnight coverage shift (22:00 - 06:00)"},
    ]

    created_shifts = {}
    for item in shifts_data:
        shift = db.query(Shift).filter(Shift.name == item["name"]).first()
        if not shift:
            shift = Shift(
                name=item["name"],
                start_time=item["start_time"],
                end_time=item["end_time"],
                description=item["description"],
                is_active=True,
            )
            db.add(shift)
            db.flush()
        created_shifts[item["name"]] = shift


def init_leave_policies_and_balances(db: Session) -> None:
    """Ensure baseline leave policies and employee balances are established."""
    default_policies = {
        LeaveType.SICK: Decimal("10.0"),
        LeaveType.CASUAL: Decimal("12.0"),
        LeaveType.PAID: Decimal("18.0"),
    }

    # Seed Leave Policies
    for leave_type, days in default_policies.items():
        policy = db.query(LeavePolicy).filter(LeavePolicy.leave_type == leave_type).first()
        if not policy:
            policy = LeavePolicy(
                leave_type=leave_type,
                total_days_allowed=days,
            )
            db.add(policy)

    db.flush()

    # Seed Leave Balances for all active employees
    employees = db.query(Employee).all()
    for emp in employees:
        for leave_type, days in default_policies.items():
            balance = (
                db.query(LeaveBalance)
                .filter(LeaveBalance.employee_id == emp.id, LeaveBalance.leave_type == leave_type)
                .first()
            )
            if not balance:
                balance = LeaveBalance(
                    employee_id=emp.id,
                    leave_type=leave_type,
                    remaining_days=days,
                )
                db.add(balance)


def init_db(db: Session = None) -> None:
    """Create all database tables and seed baseline user accounts and leave policies."""
    # Create tables
    Base.metadata.create_all(bind=engine)

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # 1. Admin Account
        admin = db.query(User).filter(User.email == "admin@worksphere.com").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@worksphere.com",
                hashed_password=hash_password("Admin@123"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.flush()

            admin_emp = Employee(
                user_id=admin.id,
                employee_code="EMP-0001",
                full_name="System Administrator",
                designation="Director of People Operations",
                department="Executive",
                joining_date=date(2023, 1, 1),
                salary=120000.00,
                status=EmployeeStatus.ACTIVE,
                phone="+1-555-0101",
            )
            db.add(admin_emp)

            db.add(Notification(
                user_id=admin.id,
                title="System Initialized",
                message="WorkSphere HRMS has been successfully initialized. Welcome to the Admin Portal.",
            ))

        # 2. HR Manager Account
        hr = db.query(User).filter(User.email == "hr@worksphere.com").first()
        if not hr:
            hr = User(
                username="hrmanager",
                email="hr@worksphere.com",
                hashed_password=hash_password("Hr@123"),
                role=UserRole.HR,
                is_active=True,
            )
            db.add(hr)
            db.flush()

            hr_emp = Employee(
                user_id=hr.id,
                employee_code="EMP-0002",
                full_name="Sarah Jenkins",
                designation="HR Business Partner",
                department="Human Resources",
                joining_date=date(2023, 6, 15),
                salary=75000.00,
                status=EmployeeStatus.ACTIVE,
                phone="+1-555-0102",
            )
            db.add(hr_emp)

            db.add(Notification(
                user_id=hr.id,
                title="HR Portal Ready",
                message="Welcome to WorkSphere HR Portal. You can manage employees, leaves, and attendance.",
            ))

        # 3. Employee Account
        emp = db.query(User).filter(User.email == "employee@worksphere.com").first()
        if not emp:
            emp = User(
                username="john_doe",
                email="employee@worksphere.com",
                hashed_password=hash_password("Emp@123"),
                role=UserRole.EMPLOYEE,
                is_active=True,
            )
            db.add(emp)
            db.flush()

            emp_record = Employee(
                user_id=emp.id,
                employee_code="EMP-0003",
                full_name="John Doe",
                designation="Senior Software Engineer",
                department="Engineering",
                joining_date=date(2024, 2, 1),
                salary=65000.00,
                status=EmployeeStatus.ACTIVE,
                phone="+1-555-0103",
            )
            db.add(emp_record)

            db.add(Notification(
                user_id=emp.id,
                title="Welcome John",
                message="Your employee portal is active. You can check in daily and request leaves.",
            ))

        db.flush()

        # Seed policies and balances
        init_leave_policies_and_balances(db)

        # Seed shifts and assignments
        init_default_shifts(db)

        db.commit()
        print("Database initialized, seed accounts, leave policies, and shifts verified.")
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    init_db()
