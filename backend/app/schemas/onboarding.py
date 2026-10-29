from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.onboarding import OnboardingStatus


class OnboardingTaskBase(BaseModel):
    task_name: str = Field(..., min_length=2, max_length=255)
    due_date: Optional[date] = None
    status: Optional[OnboardingStatus] = OnboardingStatus.PENDING


class OnboardingTaskCreate(OnboardingTaskBase):
    employee_id: int


class OnboardingTaskUpdate(BaseModel):
    task_name: Optional[str] = Field(None, min_length=2, max_length=255)
    due_date: Optional[date] = None
    status: Optional[OnboardingStatus] = None


class OnboardingStatusUpdate(BaseModel):
    status: OnboardingStatus


class OnboardingTaskResponse(BaseModel):
    id: int
    employee_id: int
    task_name: str
    status: OnboardingStatus
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OnboardingSummaryResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_percentage: float
    tasks: List[OnboardingTaskResponse]


class EmployeeOnboardingPipelineItem(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    designation: Optional[str] = None
    joining_date: Optional[date] = None
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_percentage: float

    model_config = ConfigDict(from_attributes=True)


class TemplateAssignRequest(BaseModel):
    employee_id: Optional[int] = None
    all_employees: Optional[bool] = False

