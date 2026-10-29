from datetime import date, time, timedelta
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
from app.models.user_settings import UserSettings
from app.models.onboarding import OnboardingTask, OnboardingStatus
from app.models.announcement import Announcement, AnnouncementPriority
from app.models.task import InternalTask, TaskPriority, TaskStatus
from app.models.feedback import Feedback, FeedbackStatus
from app.models.resignation import Resignation, ResignationStatus
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


def init_onboarding_tasks(db: Session) -> None:
    """Ensure baseline onboarding tasks exist for initial employees."""
    templates = [
        ("Submit Signed Offer Letter & Employment Agreement", 3),
        ("Upload Government ID & Address Proof (KYC Verification)", 5),
        ("Submit Bank Account Details for Payroll Direct Deposit", 5),
        ("IT Setup: Configure Work Laptop, Corporate Email & VPN", 7),
        ("Review & Acknowledge Employee Handbook & Code of Conduct", 7),
        ("Complete POSH & Workplace Ethics Compliance Training", 14),
        ("Complete Cyber Security & Data Privacy Training", 14),
        ("Attend First-Day HR Orientation & Meet Assigned Buddy", 10),
        ("Initial 30-Day Goal Setting Session with Department Lead", 30),
    ]

    employees = db.query(Employee).all()
    for emp in employees:
        existing = db.query(OnboardingTask).filter(OnboardingTask.employee_id == emp.id).count()
        if existing == 0:
            base_date = emp.joining_date or date.today()
            comp_count = 9 if emp.department in ("Executive", "Human Resources") else 4
            for idx, (name, day_offset) in enumerate(templates):
                task = OnboardingTask(
                    employee_id=emp.id,
                    task_name=name,
                    status=OnboardingStatus.COMPLETED if idx < comp_count else OnboardingStatus.PENDING,
                    due_date=base_date + timedelta(days=day_offset),
                )
                db.add(task)
    db.flush()


def init_phase4_seed_data(db: Session) -> None:
    """Ensure baseline Phase 4 records exist for announcements, tasks, feedback, and resignations."""
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    hr_user = db.query(User).filter(User.role == UserRole.HR).first()
    employees = db.query(Employee).all()
    emp_map = {e.id: e for e in employees}

    # 1. Announcements
    if db.query(Announcement).count() <= 1:
        announcements_data = [
            {
                "title": "Q4 Strategic Town Hall & Executive Address",
                "message": "All team members are invited to join our upcoming Quarterly Strategy Town Hall this Friday at 3:00 PM EST. The leadership team will present annual performance highlights, Q1 product roadmaps, and host an open Q&A session.",
                "priority": AnnouncementPriority.HIGH,
                "created_by": admin_user.id if admin_user else 1,
            },
            {
                "title": "Enhanced Comprehensive Health & Wellness Benefits 2026",
                "message": "We are pleased to introduce enhanced corporate health insurance coverage, including expanded dental and optical allowances, mental wellness consultations, and fitness reimbursements. Please inspect the updated policy document in the Document Center.",
                "priority": AnnouncementPriority.MEDIUM,
                "created_by": hr_user.id if hr_user else 1,
            },
            {
                "title": "Mandatory Cybersecurity & Multi-Factor Authentication Audit",
                "message": "In compliance with our annual SOC2 security certification, all employees must ensure MFA is enabled on corporate accounts by end of week.",
                "priority": AnnouncementPriority.URGENT,
                "created_by": admin_user.id if admin_user else 1,
            },
        ]
        for ad in announcements_data:
            db.add(Announcement(**ad))

    # 2. Internal Tasks
    if db.query(InternalTask).count() == 0 and len(employees) >= 3:
        today = date.today()
        tasks_data = [
            {
                "assigned_to": 3,
                "assigned_by": admin_user.id if admin_user else 1,
                "title": "Implement API Rate Limiting & Query Optimization",
                "description": "Profile slow database queries on reports and add Redis-based rate limiting to public authentication endpoints.",
                "due_date": today + timedelta(days=5),
                "priority": TaskPriority.HIGH,
                "status": TaskStatus.IN_PROGRESS,
            },
            {
                "assigned_to": 3,
                "assigned_by": hr_user.id if hr_user else 2,
                "title": "Code Review for Phase 4 Experience Modules",
                "description": "Conduct security review of resignation and feedback submission endpoints.",
                "due_date": today + timedelta(days=2),
                "priority": TaskPriority.MEDIUM,
                "status": TaskStatus.COMPLETED,
            },
            {
                "assigned_to": 2,
                "assigned_by": admin_user.id if admin_user else 1,
                "title": "Finalize Annual Performance Review Cycles",
                "description": "Prepare evaluation rubric and self-appraisal forms for next quarter performance review cycle.",
                "due_date": today + timedelta(days=4),
                "priority": TaskPriority.HIGH,
                "status": TaskStatus.IN_PROGRESS,
            },
        ]
        for td in tasks_data:
            if td["assigned_to"] in emp_map:
                db.add(InternalTask(**td))

    # 3. Feedback
    if db.query(Feedback).count() == 0 and len(employees) >= 3:
        feedback_data = [
            {
                "employee_id": 3,
                "user_id": 3,
                "category": "Work Environment",
                "rating": 5,
                "message": "The flexible hybrid work arrangement and updated workstation equipment have greatly improved team productivity and morale.",
                "is_anonymous": False,
                "status": FeedbackStatus.ACKNOWLEDGED,
                "hr_response": "Thank you John! We continue to prioritize employee wellness and ergonomic comfort.",
            },
            {
                "employee_id": None,
                "user_id": 1,
                "category": "Career Growth & Learning",
                "rating": 4,
                "message": "Would love to see more internal workshops and certifications sponsored for cloud engineering and system architecture.",
                "is_anonymous": True,
                "status": FeedbackStatus.NEW,
                "hr_response": None,
            },
        ]
        for fd in feedback_data:
            db.add(Feedback(**fd))

    # 4. Resignations
    if db.query(Resignation).count() == 0 and len(employees) >= 3:
        db.add(Resignation(
            employee_id=3,
            reason="Relocating to another city due to personal reasons.",
            notice_period=30,
            status=ResignationStatus.PENDING,
        ))

    db.flush()


def init_db(db: Session = None) -> None:
    """Create all database tables and seed baseline user accounts, leave policies, shifts, and Phase 4 data."""
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

        # Seed onboarding tasks
        init_onboarding_tasks(db)

        # Seed Phase 4 data
        init_phase4_seed_data(db)

        # Seed default user settings
        for u in db.query(User).all():
            if not db.query(UserSettings).filter(UserSettings.user_id == u.id).first():
                db.add(UserSettings(user_id=u.id))
        db.flush()

        db.commit()
        print("Database initialized, seed accounts, leave policies, shifts, and Phase 4 verified.")
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    init_db()
