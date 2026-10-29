from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.onboarding import OnboardingTask, OnboardingStatus
from app.models.notification import Notification
from app.schemas.onboarding import (
    OnboardingTaskCreate,
    OnboardingTaskUpdate,
    OnboardingStatusUpdate,
    OnboardingTaskResponse,
    OnboardingSummaryResponse,
    EmployeeOnboardingPipelineItem,
    TemplateAssignRequest,
)
from app.core.permissions import UserRole
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin

router = APIRouter(prefix="/onboarding", tags=["Employee Onboarding"])

STANDARD_ONBOARDING_TEMPLATES = [
    ("Submit Signed Offer Letter & Employment Agreement", 3),
    ("Upload Government ID & Address Proof (KYC Verification)", 5),
    ("Submit Bank Account Details for Payroll Direct Deposit", 5),
    ("IT Setup: Configure Work Laptop, Corporate Email & VPN", 7),
    ("Review & Acknowledge Employee Handbook & Code of Conduct", 7),
    ("Complete POSH & Workplace Ethics Compliance Training", 14),
    ("Complete Cyber Security & Data Privacy Training", 14),
    ("Attend First-Day HR Orientation & Meet Assigned Buddy", 10),
    ("Initial 30-Day Goal Setting Session with Department Lead", 30),
]


def _to_response(task: OnboardingTask) -> OnboardingTaskResponse:
    return OnboardingTaskResponse(
        id=task.id,
        employee_id=task.employee_id,
        task_name=task.task_name,
        status=task.status,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
        employee_name=task.employee.full_name if task.employee else None,
        employee_code=task.employee.employee_code if task.employee else None,
    )


@router.get("", response_model=List[OnboardingTaskResponse], summary="List onboarding tasks")
def list_onboarding_tasks(
    employee_id: Optional[int] = Query(None, description="Filter by employee ID (HR/Admin only)"),
    status_filter: Optional[OnboardingStatus] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(OnboardingTask)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(OnboardingTask.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(OnboardingTask.employee_id == employee_id)

    if status_filter:
        query = query.filter(OnboardingTask.status == status_filter)

    tasks = query.order_by(OnboardingTask.id.desc()).all()
    return [_to_response(t) for t in tasks]


@router.get("/summary", response_model=OnboardingSummaryResponse, summary="Get onboarding checklist summary & progress")
def get_onboarding_summary(
    employee_id: Optional[int] = Query(None, description="Employee ID (HR/Admin can specify; defaults to self)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_emp_id = None
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return OnboardingSummaryResponse(
                total_tasks=0, completed_tasks=0, pending_tasks=0, completion_percentage=0.0, tasks=[]
            )
        target_emp_id = current_user.employee.id
    else:
        target_emp_id = employee_id

    query = db.query(OnboardingTask)
    if target_emp_id:
        query = query.filter(OnboardingTask.employee_id == target_emp_id)

    tasks = query.order_by(OnboardingTask.due_date.is_(None), OnboardingTask.due_date.asc(), OnboardingTask.id.asc()).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == OnboardingStatus.COMPLETED)
    pending = total - completed
    percentage = round((completed / total) * 100.0, 1) if total > 0 else 0.0

    return OnboardingSummaryResponse(
        total_tasks=total,
        completed_tasks=completed,
        pending_tasks=pending,
        completion_percentage=percentage,
        tasks=[_to_response(t) for t in tasks],
    )


@router.get("/pipeline", response_model=List[EmployeeOnboardingPipelineItem], summary="Get onboarding pipeline for all employees (HR/Admin)")
def get_onboarding_pipeline(
    department: Optional[str] = Query(None, description="Filter by department"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)

    employees = query.order_by(Employee.id.asc()).all()
    results = []

    for emp in employees:
        tasks = db.query(OnboardingTask).filter(OnboardingTask.employee_id == emp.id).all()
        tot = len(tasks)
        comp = sum(1 for t in tasks if t.status == OnboardingStatus.COMPLETED)
        pend = tot - comp
        pct = round((comp / tot) * 100.0, 1) if tot > 0 else 0.0

        results.append(
            EmployeeOnboardingPipelineItem(
                employee_id=emp.id,
                employee_name=emp.full_name,
                employee_code=emp.employee_code,
                department=emp.department,
                designation=emp.designation,
                joining_date=emp.joining_date,
                total_tasks=tot,
                completed_tasks=comp,
                pending_tasks=pend,
                completion_percentage=pct,
            )
        )

    return results


@router.post("/assign-template", summary="Assign standard onboarding package to employee(s) (HR/Admin)")
def assign_onboarding_template(
    req: TemplateAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    target_employees = []
    if req.all_employees:
        target_employees = db.query(Employee).all()
    elif req.employee_id:
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")
        target_employees = [emp]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide employee_id or set all_employees=True")

    created_count = 0
    today = date.today()

    for emp in target_employees:
        existing_names = {
            t.task_name.lower()
            for t in db.query(OnboardingTask).filter(OnboardingTask.employee_id == emp.id).all()
        }
        base_date = emp.joining_date or today

        for name, days in STANDARD_ONBOARDING_TEMPLATES:
            if name.lower() not in existing_names:
                task = OnboardingTask(
                    employee_id=emp.id,
                    task_name=name,
                    status=OnboardingStatus.PENDING,
                    due_date=base_date + timedelta(days=days),
                )
                db.add(task)
                created_count += 1

        if emp.user_id:
            db.add(Notification(
                user_id=emp.user_id,
                title="Onboarding Checklist Assigned",
                message="Your official WorkSphere new hire onboarding checklist has been assigned. Please review your induction milestones.",
            ))

    db.commit()
    return {"message": f"Successfully assigned {created_count} onboarding tasks", "tasks_created": created_count}



@router.post("", response_model=OnboardingTaskResponse, status_code=status.HTTP_201_CREATED, summary="Create onboarding task (HR/Admin)")
def create_onboarding_task(
    req: OnboardingTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    employee = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")

    task = OnboardingTask(
        employee_id=req.employee_id,
        task_name=req.task_name.strip(),
        status=req.status or OnboardingStatus.PENDING,
        due_date=req.due_date,
    )
    db.add(task)
    db.flush()

    # Notify employee if user exists
    if employee.user_id:
        db.add(Notification(
            user_id=employee.user_id,
            title="New Onboarding Task Assigned",
            message=f"A new onboarding task has been assigned: '{task.task_name}'." + (f" Due date: {task.due_date}." if task.due_date else ""),
        ))

    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.patch("/{task_id}/status", response_model=OnboardingTaskResponse, summary="Update task completion status")
def update_task_status(
    task_id: int,
    req: OnboardingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = db.query(OnboardingTask).filter(OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding task not found")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or task.employee_id != current_user.employee.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update tasks assigned to your own profile")

    task.status = req.status
    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.put("/{task_id}", response_model=OnboardingTaskResponse, summary="Edit onboarding task details (HR/Admin)")
def update_onboarding_task(
    task_id: int,
    req: OnboardingTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    task = db.query(OnboardingTask).filter(OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding task not found")

    if req.task_name is not None:
        task.task_name = req.task_name.strip()
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.status is not None:
        task.status = req.status

    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete onboarding task (HR/Admin)")
def delete_onboarding_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    task = db.query(OnboardingTask).filter(OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding task not found")

    db.delete(task)
    db.commit()
    return None
