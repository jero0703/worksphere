from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.core.permissions import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)


class EmployeeSummary(BaseModel):
    id: int
    employee_code: str
    full_name: str
    designation: str
    department: str
    salary: Optional[float] = None
    status: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSummary] = None

    model_config = {"from_attributes": True}


class UserProfile(UserResponse):
    pass
