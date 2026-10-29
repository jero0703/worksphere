from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.core.permissions import UserRole


class ProfileUpdateRequest(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)
    emergency_contact: Optional[str] = Field(None, max_length=100)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current plaintext password")
    new_password: str = Field(..., min_length=6, max_length=100, description="New strong password")


class UserSettingsResponse(BaseModel):
    email_notifications: bool
    in_app_notifications: bool
    task_reminders: bool
    announcement_alerts: bool
    theme: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    in_app_notifications: Optional[bool] = None
    task_reminders: Optional[bool] = None
    announcement_alerts: Optional[bool] = None
    theme: Optional[str] = Field(None, max_length=20)


class FullProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    # Employee attributes if associated
    employee_id: Optional[int] = None
    employee_code: Optional[str] = None
    full_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None

    # Settings
    settings: Optional[UserSettingsResponse] = None

    model_config = ConfigDict(from_attributes=True)
