from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.task import TaskStatus, TaskPriority


class TaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[date] = None
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM


class TaskCreate(TaskBase):
    assigned_to: int = Field(..., description="Employee ID to assign task to")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[int] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskResponse(BaseModel):
    id: int
    assigned_to: int
    assigned_by: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    assignee_name: Optional[str] = None
    assignee_code: Optional[str] = None
    assigner_name: Optional[str] = None
    is_overdue: bool = False

    model_config = ConfigDict(from_attributes=True)


class TaskMetricsResponse(BaseModel):
    total_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completed_tasks: int
    overdue_tasks: int
