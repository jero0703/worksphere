import os
os.environ["TESTING"] = "1"

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.database import get_db
from app.main import app
from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.leave import LeavePolicy, LeaveBalance, LeaveType
from app.models.shift import Shift, EmployeeShift
from app.models.document import Document
from app.models.performance import Performance
from app.models.onboarding import OnboardingTask
from app.models.resignation import Resignation
from app.models.announcement import Announcement
from app.models.task import InternalTask
from app.models.feedback import Feedback
from app.models.user_settings import UserSettings
from app.core.security import hash_password
from app.core.permissions import UserRole
from datetime import date, time

# Use in-memory SQLite for isolated fast unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed Leave Policies
    default_policies = {
        LeaveType.SICK: Decimal("10.0"),
        LeaveType.CASUAL: Decimal("12.0"),
        LeaveType.PAID: Decimal("18.0"),
    }
    for lt, days in default_policies.items():
        db.add(LeavePolicy(leave_type=lt, total_days_allowed=days))

    # Seed Admin
    admin = User(
        username="test_admin",
        email="test_admin@worksphere.com",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    admin_emp = Employee(
        user_id=admin.id,
        employee_code="EMP-9001",
        full_name="Admin User",
        designation="Administrator",
        department="Operations",
        joining_date=date(2023, 1, 1),
        salary=Decimal("100000.00"),
        status=EmployeeStatus.ACTIVE,
    )
    db.add(admin_emp)
    db.flush()
    for lt, days in default_policies.items():
        db.add(LeaveBalance(employee_id=admin_emp.id, leave_type=lt, remaining_days=days))

    # Seed HR
    hr = User(
        username="test_hr",
        email="test_hr@worksphere.com",
        hashed_password=hash_password("Hr@123"),
        role=UserRole.HR,
        is_active=True,
    )
    db.add(hr)
    db.flush()
    hr_emp = Employee(
        user_id=hr.id,
        employee_code="EMP-9002",
        full_name="HR User",
        designation="HR Manager",
        department="HR",
        joining_date=date(2023, 1, 1),
        salary=Decimal("70000.00"),
        status=EmployeeStatus.ACTIVE,
    )
    db.add(hr_emp)
    db.flush()
    for lt, days in default_policies.items():
        db.add(LeaveBalance(employee_id=hr_emp.id, leave_type=lt, remaining_days=days))

    # Seed Employee 1
    emp1 = User(
        username="test_employee",
        email="test_employee@worksphere.com",
        hashed_password=hash_password("Emp@123"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(emp1)
    db.flush()
    emp1_rec = Employee(
        user_id=emp1.id,
        employee_code="EMP-9003",
        full_name="Employee User",
        designation="Engineer",
        department="Tech",
        joining_date=date(2023, 1, 1),
        salary=Decimal("60000.00"),
        status=EmployeeStatus.ACTIVE,
    )
    db.add(emp1_rec)
    db.flush()
    for lt, days in default_policies.items():
        db.add(LeaveBalance(employee_id=emp1_rec.id, leave_type=lt, remaining_days=days))

    # Seed Employee 2 (for cross-employee ownership tests)
    emp2 = User(
        username="test_employee2",
        email="test_employee2@worksphere.com",
        hashed_password=hash_password("Emp@123"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(emp2)
    db.flush()
    emp2_rec = Employee(
        user_id=emp2.id,
        employee_code="EMP-9004",
        full_name="Second Employee",
        designation="Designer",
        department="Design",
        joining_date=date(2023, 3, 1),
        salary=Decimal("55000.00"),
        status=EmployeeStatus.ACTIVE,
    )
    db.add(emp2_rec)
    db.flush()
    for lt, days in default_policies.items():
        db.add(LeaveBalance(employee_id=emp2_rec.id, leave_type=lt, remaining_days=days))

    # Seed Default Shifts
    m_shift = Shift(name="Morning Shift", start_time=time(9, 0), end_time=time(17, 0), description="Standard day", is_active=True)
    e_shift = Shift(name="Evening Shift", start_time=time(16, 0), end_time=time(0, 0), description="Evening shift", is_active=True)
    n_shift = Shift(name="Night Shift", start_time=time(22, 0), end_time=time(6, 0), description="Overnight shift", is_active=True)
    db.add_all([m_shift, e_shift, n_shift])
    db.flush()

    for emp in [admin_emp, hr_emp, emp1_rec, emp2_rec]:
        db.add(EmployeeShift(
            employee_id=emp.id,
            shift_id=m_shift.id,
            effective_from=date(2023, 1, 1),
            effective_to=None,
        ))

    # Seed UserSettings
    for u in [admin, hr, emp1, emp2]:
        db.add(UserSettings(user_id=u.id))

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_token(client):
    res = client.post("/api/auth/login", json={"email": "test_admin@worksphere.com", "password": "Admin@123"})
    return res.json()["access_token"]


@pytest.fixture()
def hr_token(client):
    res = client.post("/api/auth/login", json={"email": "test_hr@worksphere.com", "password": "Hr@123"})
    return res.json()["access_token"]


@pytest.fixture()
def employee_token(client):
    res = client.post("/api/auth/login", json={"email": "test_employee@worksphere.com", "password": "Emp@123"})
    return res.json()["access_token"]


@pytest.fixture()
def employee2_token(client):
    res = client.post("/api/auth/login", json={"email": "test_employee2@worksphere.com", "password": "Emp@123"})
    return res.json()["access_token"]
