from app.dependencies.auth import get_current_user, get_current_active_user
from app.dependencies.permissions import (
    require_role,
    require_any_role,
    require_admin,
    require_hr,
    require_employee,
    require_hr_or_admin,
)

__all__ = [
    "get_current_user",
    "get_current_active_user",
    "require_role",
    "require_any_role",
    "require_admin",
    "require_hr",
    "require_employee",
    "require_hr_or_admin",
]
