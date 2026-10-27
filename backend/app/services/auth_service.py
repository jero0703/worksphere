from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.notification import Notification
from app.schemas.auth import RegisterRequest, Token
from app.schemas.user import UserResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.permissions import UserRole
from app.core.config import settings


def register_user(db: Session, req: RegisterRequest) -> User:
    """
    Register a new user account with EMPLOYEE role and associate an Employee record.
    Strictly forbids self-assigning HR or ADMIN roles.
    """
    # Check email uniqueness
    existing_email = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Check username uniqueness
    existing_username = db.query(User).filter(User.username == req.username.strip()).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken",
        )

    # Hash password with Argon2
    hashed = hash_password(req.password)

    # Public registration is strictly restricted to EMPLOYEE role
    user = User(
        username=req.username.strip(),
        email=req.email.lower().strip(),
        hashed_password=hashed,
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.flush()  # Obtain user.id

    # Generate employee code
    count = db.query(Employee).count() + 1
    employee_code = f"EMP-{count:04d}"

    employee = Employee(
        user_id=user.id,
        employee_code=employee_code,
        full_name=req.full_name.strip(),
        designation=req.designation or "Team Member",
        department=req.department or "General",
        joining_date=date.today(),
        salary=30000.00,
        status=EmployeeStatus.ACTIVE,
    )
    db.add(employee)
    db.flush()

    # Initialize leave balances for newly registered employee
    from app.models.leave import LeavePolicy, LeaveBalance
    policies = db.query(LeavePolicy).all()
    for policy in policies:
        db.add(LeaveBalance(
            employee_id=employee.id,
            leave_type=policy.leave_type,
            remaining_days=policy.total_days_allowed,
        ))

    # Welcome notification
    welcome_notification = Notification(
        user_id=user.id,
        title="Welcome to WorkSphere!",
        message="Your account has been registered successfully. You can now track attendance, apply for leaves, and view payslips.",
    )
    db.add(welcome_notification)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Validate credentials and return user."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact an administrator.",
        )

    return user


def generate_user_token(user: User) -> Token:
    """Generate JWT Token response schema for an authenticated user."""
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
    )
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    user_resp = UserResponse.model_validate(user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=user_resp,
    )
