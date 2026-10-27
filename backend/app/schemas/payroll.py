from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from app.models.payroll import PayrollStatus


class PayrollGenerateRequest(BaseModel):
    employee_id: int
    month: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Payroll month format YYYY-MM")
    basic_salary: Optional[Decimal] = Field(None, ge=0)
    allowances: Decimal = Field(Decimal("0.00"), ge=0)
    deductions: Decimal = Field(Decimal("0.00"), ge=0)
    bonus: Decimal = Field(Decimal("0.00"), ge=0)
    payment_method: str = Field("Direct Deposit", max_length=50)
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class PayrollResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    basic_salary: Decimal
    allowances: Decimal
    deductions: Decimal
    bonus: Decimal
    net_salary: Decimal
    month: str
    payment_date: Optional[date] = None
    payment_method: str
    status: PayrollStatus
    notes: Optional[str] = None
    generated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PayrollSummaryResponse(BaseModel):
    month: str
    total_records: int
    total_basic: Decimal
    total_allowances: Decimal
    total_deductions: Decimal
    total_bonus: Decimal
    total_net_salary: Decimal


class PayrollStatusUpdateRequest(BaseModel):
    status: PayrollStatus
    payment_date: Optional[date] = None
    notes: Optional[str] = None
