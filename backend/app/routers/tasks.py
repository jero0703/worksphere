from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.task import InternalTask, TaskStatus, TaskPriority
from app.models.notification import Notification
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskResponse,
    TaskMetricsResponse,
)
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin

router = APIRouter(prefix="/tasks", tags=["Internal Tasks"])


def _to_response(t: InternalTask) -> TaskResponse:
    today = date.today()
    is_overdue = bool(t.due_date and t.due_date < today and t.status != TaskStatus.COMPLETED)
    assigner_name = t.creator.username if t.creator else None
    if t.creator and t.creator.employee:
        assigner_name = t.creator.employee.full_name

    return TaskResponse(
        id=t.id,
        assigned_to=t.assigned_to,
        assigned_by=t.assigned_by,
        title=t.title,
        description=t.description,
        due_date=t.due_date,
        priority=t.priority,
        status=t.status,
        created_at=t.created_at,
        updated_at=t.updated_at,
        assignee_name=t.employee.full_name if t.employee else None,
        assignee_code=t.employee.employee_code if t.employee else None,
        assigner_name=assigner_name,
        is_overdue=is_overdue,
    )


@router.get("", response_model=List[TaskResponse], summary="List internal tasks")
def list_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    employee_id: Optional[int] = Query(None, description="Filter by employee ID (HR/Admin only)"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(InternalTask)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(InternalTask.assigned_to == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(InternalTask.assigned_to == employee_id)

    if status_filter:
        query = query.filter(InternalTask.status == status_filter)

    if priority:
        query = query.filter(InternalTask.priority == priority)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (InternalTask.title.ilike(pattern)) | (InternalTask.description.ilike(pattern))
        )

    tasks = query.order_by(InternalTask.due_date.is_(None), InternalTask.due_date.asc(), InternalTask.id.desc()).all()
    return [_to_response(t) for t in tasks]


@router.get("/metrics", response_model=TaskMetricsResponse, summary="Get task counts and metrics")
def get_task_metrics(
    employee_id: Optional[int] = Query(None, description="Employee ID (HR/Admin can specify; defaults to self for employee)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(InternalTask)
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return TaskMetricsResponse(total_tasks=0, pending_tasks=0, in_progress_tasks=0, completed_tasks=0, overdue_tasks=0)
        query = query.filter(InternalTask.assigned_to == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(InternalTask.assigned_to == employee_id)

    all_tasks = query.all()
    today = date.today()

    total = len(all_tasks)
    pending = sum(1 for t in all_tasks if t.status == TaskStatus.PENDING)
    in_prog = sum(1 for t in all_tasks if t.status == TaskStatus.IN_PROGRESS)
    completed = sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED)
    overdue = sum(1 for t in all_tasks if t.due_date and t.due_date < today and t.status != TaskStatus.COMPLETED)

    return TaskMetricsResponse(
        total_tasks=total,
        pending_tasks=pending,
        in_progress_tasks=in_prog,
        completed_tasks=completed,
        overdue_tasks=overdue,
    )


@router.get("/{task_id}", response_model=TaskResponse, summary="Get single task")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    t = db.query(InternalTask).filter(InternalTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or t.assigned_to != current_user.employee.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this task")

    return _to_response(t)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary="Create task (HR/Admin)")
def create_task(
    req: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    emp = db.query(Employee).filter(Employee.id == req.assigned_to).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned employee not found")

    task = InternalTask(
        assigned_to=req.assigned_to,
        assigned_by=current_user.id,
        title=req.title.strip(),
        description=req.description.strip() if req.description else None,
        due_date=req.due_date,
        priority=req.priority or TaskPriority.MEDIUM,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.flush()

    if emp.user_id:
        db.add(Notification(
            user_id=emp.user_id,
            title="New Task Assigned",
            message=f"You have been assigned: '{task.title}' [{task.priority.value}]." + (f" Due: {task.due_date}." if task.due_date else ""),
        ))

    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.patch("/{task_id}/status", response_model=TaskResponse, summary="Update task status")
def update_task_status(
    task_id: int,
    req: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = db.query(InternalTask).filter(InternalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or task.assigned_to != current_user.employee.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update tasks assigned to you")

    task.status = req.status
    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.put("/{task_id}", response_model=TaskResponse, summary="Update task details (HR/Admin)")
def update_task(
    task_id: int,
    req: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    task = db.query(InternalTask).filter(InternalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if req.assigned_to is not None:
        emp = db.query(Employee).filter(Employee.id == req.assigned_to).first()
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned employee not found")
        task.assigned_to = req.assigned_to

    if req.title is not None:
        task.title = req.title.strip()
    if req.description is not None:
        task.description = req.description.strip() if req.description else None
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.priority is not None:
        task.priority = req.priority
    if req.status is not None:
        task.status = req.status

    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task (HR/Admin)")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    task = db.query(InternalTask).filter(InternalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()
    return None
