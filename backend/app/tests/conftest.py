import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.database import get_db
from app.main import app
from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.core.security import hash_password
from app.core.permissions import UserRole
from datetime import date

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
    db.add(Employee(
        user_id=admin.id,
        employee_code="EMP-9001",
        full_name="Admin User",
        designation="Administrator",
        department="Operations",
        joining_date=date(2023, 1, 1),
        salary=100000.00,
        status=EmployeeStatus.ACTIVE,
    ))

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
    db.add(Employee(
        user_id=hr.id,
        employee_code="EMP-9002",
        full_name="HR User",
        designation="HR Manager",
        department="HR",
        joining_date=date(2023, 1, 1),
        salary=70000.00,
        status=EmployeeStatus.ACTIVE,
    ))

    # Seed Employee
    emp = User(
        username="test_employee",
        email="test_employee@worksphere.com",
        hashed_password=hash_password("Emp@123"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(emp)
    db.flush()
    db.add(Employee(
        user_id=emp.id,
        employee_code="EMP-9003",
        full_name="Employee User",
        designation="Engineer",
        department="Tech",
        joining_date=date(2023, 1, 1),
        salary=60000.00,
        status=EmployeeStatus.ACTIVE,
    ))

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
