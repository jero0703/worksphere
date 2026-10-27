import io
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.payroll import Payroll, PayrollStatus
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.user import User
from app.schemas.payroll import (
    PayrollGenerateRequest,
    PayrollResponse,
    PayrollStatusUpdateRequest,
    PayrollSummaryResponse,
)


def _format_payroll_response(pr: Payroll, emp: Optional[Employee] = None) -> PayrollResponse:
    employee = emp or pr.employee
    return PayrollResponse(
        id=pr.id,
        employee_id=pr.employee_id,
        employee_name=employee.full_name if employee else None,
        employee_code=employee.employee_code if employee else None,
        department=employee.department if employee else None,
        designation=employee.designation if employee else None,
        basic_salary=pr.basic_salary,
        allowances=pr.allowances,
        deductions=pr.deductions,
        bonus=pr.bonus,
        net_salary=pr.net_salary,
        month=pr.month,
        payment_date=pr.payment_date,
        payment_method=pr.payment_method,
        status=pr.status,
        notes=pr.notes,
        generated_by=pr.generated_by,
        created_at=pr.created_at,
        updated_at=pr.updated_at,
    )


def generate_payroll_record(
    db: Session,
    req: PayrollGenerateRequest,
    admin_user: User,
) -> PayrollResponse:
    """Generate monthly payroll for an employee with formula net_salary = basic + allowances + bonus - deductions."""
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Check for existing duplicate payroll for this employee and month
    existing = (
        db.query(Payroll)
        .filter(Payroll.employee_id == req.employee_id, Payroll.month == req.month)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payroll for {emp.full_name} for period {req.month} has already been generated.",
        )

    # Use specified basic salary or fallback to employee's contract salary
    basic = req.basic_salary if req.basic_salary is not None else emp.salary
    allowances = req.allowances
    deductions = req.deductions
    bonus = req.bonus

    if basic < Decimal("0.00") or allowances < Decimal("0.00") or deductions < Decimal("0.00") or bonus < Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Salary amounts cannot be negative.")

    net_salary = basic + allowances + bonus - deductions
    if net_salary < Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid calculation: Deductions ({deductions}) cannot exceed Gross Earnings ({basic + allowances + bonus}).",
        )

    payroll = Payroll(
        employee_id=req.employee_id,
        basic_salary=basic,
        allowances=allowances,
        deductions=deductions,
        bonus=bonus,
        net_salary=net_salary,
        month=req.month,
        payment_date=req.payment_date or date.today(),
        payment_method=req.payment_method,
        status=PayrollStatus.PAID,
        notes=req.notes,
        generated_by=admin_user.id,
    )
    db.add(payroll)

    # Notify employee that payroll is released
    if emp.user_id:
        db.add(Notification(
            user_id=emp.user_id,
            title=f"Payslip Available for {req.month}",
            message=f"Your payroll slip for {req.month} is now available. Net salary: ${net_salary:,.2f}.",
            link="/payroll",
        ))

    db.commit()
    db.refresh(payroll)
    return _format_payroll_response(payroll, emp)


def get_employee_payroll_records(db: Session, employee_id: int) -> List[PayrollResponse]:
    """Retrieve payroll history for a specific employee."""
    records = (
        db.query(Payroll)
        .filter(Payroll.employee_id == employee_id)
        .order_by(Payroll.month.desc())
        .all()
    )
    return [_format_payroll_response(r) for r in records]


def get_all_payroll_records(
    db: Session,
    month: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[PayrollStatus] = None,
    employee_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[PayrollResponse], int]:
    """HR/Admin query for payroll records with filtering and pagination."""
    query = db.query(Payroll).join(Employee)

    if month:
        query = query.filter(Payroll.month == month)
    if department:
        query = query.filter(Employee.department == department)
    if status_filter:
        query = query.filter(Payroll.status == status_filter)
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)

    total = query.count()
    records = query.order_by(Payroll.month.desc(), Payroll.created_at.desc()).offset(offset).limit(limit).all()
    return [_format_payroll_response(r) for r in records], total


def get_payroll_by_id(db: Session, payroll_id: int) -> PayrollResponse:
    """Retrieve a single payroll record."""
    pr = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")
    return _format_payroll_response(pr)


def get_payroll_monthly_summary(db: Session, month: str) -> PayrollSummaryResponse:
    """Aggregate totals for a specific month."""
    records = db.query(Payroll).filter(Payroll.month == month).all()
    total_records = len(records)
    total_basic = sum((r.basic_salary for r in records), Decimal("0.00"))
    total_allowances = sum((r.allowances for r in records), Decimal("0.00"))
    total_bonus = sum((r.bonus for r in records), Decimal("0.00"))
    total_deductions = sum((r.deductions for r in records), Decimal("0.00"))
    total_net = sum((r.net_salary for r in records), Decimal("0.00"))

    return PayrollSummaryResponse(
        month=month,
        total_records=total_records,
        total_basic=total_basic,
        total_allowances=total_allowances,
        total_bonus=total_bonus,
        total_deductions=total_deductions,
        total_net_salary=total_net,
    )


def update_payroll_status(
    db: Session,
    payroll_id: int,
    req: PayrollStatusUpdateRequest,
) -> PayrollResponse:
    """Update payment status of a payroll item."""
    pr = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    pr.status = req.status
    if req.payment_date:
        pr.payment_date = req.payment_date
    if req.notes:
        pr.notes = req.notes

    db.commit()
    db.refresh(pr)
    return _format_payroll_response(pr)


def generate_payslip_pdf(payroll_id: int, db: Session) -> bytes:
    """Generate professional PDF payslip using ReportLab."""
    pr = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    emp = pr.employee
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PayslipTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#312E81"),
        alignment=1,  # Center
    )
    sub_style = ParagraphStyle(
        "PayslipSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=6,
    )
    cell_style = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    bold_cell_style = ParagraphStyle(
        "BoldCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # Header
    story.append(Paragraph("WorkSphere HRMS", title_style))
    story.append(Paragraph("Official Monthly Salary Payslip", sub_style))
    story.append(Spacer(1, 15))

    # Employee Information Block
    info_data = [
        [
            Paragraph("<b>Employee Name:</b>", bold_cell_style),
            Paragraph(emp.full_name, cell_style),
            Paragraph("<b>Payslip Period:</b>", bold_cell_style),
            Paragraph(pr.month, cell_style),
        ],
        [
            Paragraph("<b>Employee ID:</b>", bold_cell_style),
            Paragraph(emp.employee_code, cell_style),
            Paragraph("<b>Payment Date:</b>", bold_cell_style),
            Paragraph(str(pr.payment_date or date.today()), cell_style),
        ],
        [
            Paragraph("<b>Department:</b>", bold_cell_style),
            Paragraph(emp.department, cell_style),
            Paragraph("<b>Payment Method:</b>", bold_cell_style),
            Paragraph(pr.payment_method, cell_style),
        ],
        [
            Paragraph("<b>Designation:</b>", bold_cell_style),
            Paragraph(emp.designation, cell_style),
            Paragraph("<b>Status:</b>", bold_cell_style),
            Paragraph(pr.status.value, cell_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[110, 150, 110, 160])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Earnings & Deductions Breakdown
    story.append(Paragraph("Salary Earnings and Deductions Breakdown", section_style))

    breakdown_data = [
        [
            Paragraph("<b>Earnings</b>", bold_cell_style),
            Paragraph("<b>Amount ($)</b>", bold_cell_style),
            Paragraph("<b>Deductions</b>", bold_cell_style),
            Paragraph("<b>Amount ($)</b>", bold_cell_style),
        ],
        [
            Paragraph("Basic Salary", cell_style),
            Paragraph(f"${pr.basic_salary:,.2f}", cell_style),
            Paragraph("Standard Deductions", cell_style),
            Paragraph(f"${pr.deductions:,.2f}", cell_style),
        ],
        [
            Paragraph("Allowances", cell_style),
            Paragraph(f"${pr.allowances:,.2f}", cell_style),
            Paragraph("—", cell_style),
            Paragraph("$0.00", cell_style),
        ],
        [
            Paragraph("Bonus", cell_style),
            Paragraph(f"${pr.bonus:,.2f}", cell_style),
            Paragraph("—", cell_style),
            Paragraph("$0.00", cell_style),
        ],
        [
            Paragraph("<b>Total Gross Earnings:</b>", bold_cell_style),
            Paragraph(f"<b>${pr.basic_salary + pr.allowances + pr.bonus:,.2f}</b>", bold_cell_style),
            Paragraph("<b>Total Deductions:</b>", bold_cell_style),
            Paragraph(f"<b>${pr.deductions:,.2f}</b>", bold_cell_style),
        ],
    ]

    breakdown_table = Table(breakdown_data, colWidths=[170, 95, 170, 95])
    breakdown_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#C7D2FE")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E7FF")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(breakdown_table)
    story.append(Spacer(1, 15))

    # Net Salary Highlight Box
    net_data = [
        [
            Paragraph("<b>Net Salary Payable:</b>", ParagraphStyle("NetH", parent=bold_cell_style, fontSize=12, textColor=colors.white)),
            Paragraph(f"<b>${pr.net_salary:,.2f}</b>", ParagraphStyle("NetV", parent=bold_cell_style, fontSize=14, textColor=colors.white, alignment=2)),
        ]
    ]
    net_table = Table(net_data, colWidths=[260, 270])
    net_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#4338CA")),
        ("PADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(net_table)
    story.append(Spacer(1, 25))

    # Footer Notes
    footer_text = (
        "<i>This is a computer-generated payslip and requires no physical signature. "
        "Generated via WorkSphere Enterprise HRMS on "
        f"{datetime.now().strftime('%B %d, %Y at %I:%M %p')}.</i>"
    )
    story.append(Paragraph(footer_text, sub_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
