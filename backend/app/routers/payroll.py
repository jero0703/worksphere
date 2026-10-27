from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.payroll import PayrollStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_hr_or_admin, verify_employee_ownership
from app.schemas.payroll import (
    PayrollGenerateRequest,
    PayrollResponse,
    PayrollStatusUpdateRequest,
    PayrollSummaryResponse,
)
from app.services import payroll_service

router = APIRouter(prefix="/payroll", tags=["Payroll Management"])


@router.post(
    "/generate",
    response_model=PayrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate monthly payroll (HR/Admin)",
    description="Calculates Net Salary = Basic + Allowances + Bonus - Deductions, prevents duplicate generation, and notifies employee.",
)
def generate_payroll(
    req: PayrollGenerateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return payroll_service.generate_payroll_record(db, req, admin_user)


@router.get(
    "/employees/list",
    summary="List active employees for payroll generation (HR/Admin)",
)
def get_payroll_eligible_employees(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    emps = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).all()
    return [
        {
            "id": e.id,
            "employee_code": e.employee_code,
            "full_name": e.full_name,
            "department": e.department,
            "designation": e.designation,
            "salary": float(e.salary) if e.salary else 0.0,
        }
        for e in emps
    ]


@router.get(
    "/me",
    response_model=List[PayrollResponse],
    summary="Get personal payroll history",
    description="Retrieve personal salary records and payslips for the authenticated employee.",
)
def get_my_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.employee:
        return []
    return payroll_service.get_employee_payroll_records(db, current_user.employee.id)


@router.get(
    "",
    response_model=List[PayrollResponse],
    summary="Get all payroll records (HR/Admin)",
)
def get_all_payroll(
    month: Optional[str] = Query(None, description="Filter month (YYYY-MM)"),
    department: Optional[str] = None,
    status_filter: Optional[PayrollStatus] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    records, _ = payroll_service.get_all_payroll_records(
        db,
        month=month,
        department=department,
        status_filter=status_filter,
        employee_id=employee_id,
        limit=limit,
        offset=offset,
    )
    return records


@router.get(
    "/summary",
    response_model=PayrollSummaryResponse,
    summary="Get monthly payroll financial summary (HR/Admin)",
)
def get_payroll_summary(
    month: str = Query(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Target month YYYY-MM"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return payroll_service.get_payroll_monthly_summary(db, month)


@router.get(
    "/{payroll_id}",
    response_model=PayrollResponse,
    summary="Get payroll record by ID",
    description="Restricted by ownership: Employees can only view their own payroll records.",
)
def get_payroll_by_id(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pr = payroll_service.get_payroll_by_id(db, payroll_id)
    verify_employee_ownership(current_user, pr.employee_id)
    return pr


@router.get(
    "/{payroll_id}/payslip",
    summary="Download PDF payslip",
    description="Generates an official formatted PDF payslip. Restricted by ownership.",
)
def download_payslip_pdf(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pr = payroll_service.get_payroll_by_id(db, payroll_id)
    verify_employee_ownership(current_user, pr.employee_id)

    pdf_content = payroll_service.generate_payslip_pdf(payroll_id, db)
    filename = f"payslip_{pr.employee_code}_{pr.month}.pdf"

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.patch(
    "/{payroll_id}/status",
    response_model=PayrollResponse,
    summary="Update payroll status (HR/Admin)",
)
def update_status(
    payroll_id: int,
    req: PayrollStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_hr_or_admin),
):
    return payroll_service.update_payroll_status(db, payroll_id, req)
