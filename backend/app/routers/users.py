from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr, Field

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.leave import LeavePolicy, LeaveBalance
from app.models.attendance import Attendance
from app.models.leave import Leave
from app.models.payroll import Payroll
from app.models.notification import Notification
from app.models.user_settings import UserSettings
from app.schemas.user import UserResponse
from app.core.permissions import UserRole
from app.core.security import hash_password
from app.dependencies.permissions import require_admin

router = APIRouter(prefix="/users", tags=["Admin User Management"])


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field("General", max_length=100)
    designation: str = Field("Staff", max_length=100)
    salary: Optional[float] = Field(50000.0, ge=0)


class UpdateRoleRequest(BaseModel):
    role: UserRole


class UpdateStatusRequest(BaseModel):
    is_active: bool


class AdminUpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


@router.get(
    "",
    response_model=List[UserResponse],
    summary="List all users with search and filters (Admin only)",
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    query = db.query(User).outerjoin(Employee)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                Employee.full_name.ilike(search_pattern),
            )
        )

    users = query.order_by(User.id.asc()).offset(skip).limit(limit).all()
    return users


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user with designated role (Admin only)",
)
def create_user_by_admin(
    req: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    # Uniqueness checks
    if db.query(User).filter(User.email == req.email.lower().strip()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")
    if db.query(User).filter(User.username == req.username.strip()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken")

    user = User(
        username=req.username.strip(),
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    count = db.query(Employee).count() + 1
    employee_code = f"EMP-{count:04d}"

    emp = Employee(
        user_id=user.id,
        employee_code=employee_code,
        full_name=req.full_name.strip(),
        designation=req.designation,
        department=req.department,
        joining_date=date.today(),
        salary=req.salary or 50000.0,
        status=EmployeeStatus.ACTIVE,
    )
    db.add(emp)
    db.flush()

    # Seed leave balances
    policies = db.query(LeavePolicy).all()
    for policy in policies:
        db.add(LeaveBalance(
            employee_id=emp.id,
            leave_type=policy.leave_type,
            remaining_days=policy.total_days_allowed,
        ))

    db.add(Notification(
        user_id=user.id,
        title="Account Provisioned by Administrator",
        message=f"Welcome {emp.full_name}! Your account has been provisioned with the {user.role.value} role.",
    ))

    db.add(UserSettings(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (Admin only)",
)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user and employee information (Admin only)",
)
def update_user_details(
    user_id: int,
    req: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Protection: Prevent modifying/demoting the final active admin
    if user.role == UserRole.ADMIN and req.role and req.role != UserRole.ADMIN:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining active Administrator.",
            )

    if user.role == UserRole.ADMIN and req.is_active is False:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last remaining active Administrator.",
            )

    if req.email and req.email.lower().strip() != user.email:
        existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already in use")
        user.email = req.email.lower().strip()

    if req.username and req.username.strip() != user.username:
        existing = db.query(User).filter(User.username == req.username.strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already in use")
        user.username = req.username.strip()

    if req.role:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active

    if user.employee:
        if req.full_name:
            user.employee.full_name = req.full_name.strip()
        if req.department:
            user.employee.department = req.department.strip()
        if req.designation:
            user.employee.designation = req.designation.strip()

    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Assign user role (Admin only)",
)
def update_user_role(
    user_id: int,
    req: UpdateRoleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Protect final active admin
    if user.role == UserRole.ADMIN and req.role != UserRole.ADMIN:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining active Administrator.",
            )

    user.role = req.role
    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    summary="Activate or deactivate user account (Admin only)",
)
def update_user_status(
    user_id: int,
    req: UpdateStatusRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Protect final active admin
    if user.role == UserRole.ADMIN and not req.is_active:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last remaining active Administrator.",
            )

    user.is_active = req.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    summary="Delete or safely retire user account (Admin only)",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Protection: Cannot delete last active admin
    if user.role == UserRole.ADMIN:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining active Administrator.",
            )

    # Check if user has associated payroll, leaves, or attendance history
    emp = user.employee
    has_history = False
    if emp:
        has_payroll = db.query(Payroll).filter(Payroll.employee_id == emp.id).first()
        has_leaves = db.query(Leave).filter(Leave.employee_id == emp.id).first()
        has_att = db.query(Attendance).filter(Attendance.employee_id == emp.id).first()
        if has_payroll or has_leaves or has_att:
            has_history = True

    if has_history:
        # Soft delete by deactivating to preserve audit and financial records
        user.is_active = False
        if emp:
            emp.status = EmployeeStatus.INACTIVE
        db.commit()
        return {
            "message": "User account was deactivated rather than hard-deleted to preserve organizational, attendance, and payroll audit records.",
            "is_active": False,
        }

    # If no historical records exist, hard delete is safe
    db.delete(user)
    db.commit()
    return {"message": "User account successfully deleted."}
