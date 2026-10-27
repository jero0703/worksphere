from typing import List, Callable
from fastapi import Depends, HTTPException, status

from app.models.user import User
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user


def require_role(required_role: UserRole) -> Callable:
    """Dependency factory that checks if current user has the required role."""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires {required_role.value} role",
            )
        return current_user

    return role_checker


def require_any_role(allowed_roles: List[UserRole]) -> Callable:
    """Dependency factory that checks if current user has any of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            role_names = ", ".join([r.value for r in allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of [{role_names}] roles",
            )
        return current_user

    return role_checker


def verify_employee_ownership(current_user: User, employee_id: int) -> bool:
    """
    Enforces resource ownership.
    EMPLOYEE can only access their own records.
    HR and ADMIN have elevated access to organizational records.
    """
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or current_user.employee.id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only access your own personal records.",
            )
    return True


# Commonly used dependencies
require_admin = require_role(UserRole.ADMIN)
require_hr = require_role(UserRole.HR)
require_employee = require_role(UserRole.EMPLOYEE)
require_hr_or_admin = require_any_role([UserRole.HR, UserRole.ADMIN])
require_authenticated = get_current_active_user
