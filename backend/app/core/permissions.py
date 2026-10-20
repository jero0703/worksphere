from enum import Enum
from typing import List


class UserRole(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    HR = "HR"
    ADMIN = "ADMIN"


ROLE_HIERARCHY = {
    UserRole.ADMIN: [UserRole.ADMIN, UserRole.HR, UserRole.EMPLOYEE],
    UserRole.HR: [UserRole.HR, UserRole.EMPLOYEE],
    UserRole.EMPLOYEE: [UserRole.EMPLOYEE],
}


def is_role_authorized(user_role: str, allowed_roles: List[UserRole | str]) -> bool:
    """Check if the user's role is in the allowed roles list."""
    allowed_str_roles = [r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles]
    return user_role in allowed_str_roles
