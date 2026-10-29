import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List

from app.core.config import settings

logger = logging.getLogger("worksphere.email")


def is_smtp_configured() -> bool:
    """Return whether SMTP credentials and host are configured."""
    return bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    plain_text: Optional[str] = None,
) -> bool:
    """
    Send an email notification safely via SMTP.
    If SMTP is not configured or fails, logs warning and returns False gracefully
    without raising an unhandled exception or leaking credentials.
    """
    if not is_smtp_configured():
        logger.info(f"SMTP not configured. Email to {to_email} (Subject: '{subject}') skipped.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email

        text_content = plain_text or html_body.replace("<br>", "\n").replace("</p>", "\n")
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        try:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
            logger.info(f"Email successfully dispatched to {to_email} (Subject: '{subject}')")
            return True
        finally:
            server.quit()

    except Exception as e:
        logger.warning(f"Failed to send email to {to_email}: {e}")
        return False


def notify_onboarding_task(email: str, employee_name: str, task_name: str, due_date: Optional[str] = None) -> bool:
    subject = f"WorkSphere: New Onboarding Task - {task_name}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to WorkSphere Onboarding</h2>
        <p>Hello <strong>{employee_name}</strong>,</p>
        <p>A new onboarding checklist task has been assigned to you:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #4f46e5; margin: 15px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Task:</strong> {task_name}</p>
            {f'<p style="margin: 5px 0 0 0; color: #64748b;"><strong>Due Date:</strong> {due_date}</p>' if due_date else ''}
        </div>
        <p>Please log in to your WorkSphere portal to track and mark this task as completed.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <small style="color: #94a3b8;">WorkSphere HR Management System &copy; 2026</small>
    </div>
    """
    return send_email(email, subject, html)


def notify_resignation_update(email: str, employee_name: str, status: str, comments: Optional[str] = None) -> bool:
    subject = f"WorkSphere: Resignation Request Update - {status}"
    status_color = "#16a34a" if status == "APPROVED" else "#dc2626"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Resignation Request Status Update</h2>
        <p>Hello <strong>{employee_name}</strong>,</p>
        <p>Your submitted resignation request has been reviewed by HR.</p>
        <p>Status: <strong style="color: {status_color};">{status}</strong></p>
        {f'<p><strong>Reviewer Remarks:</strong> {comments}</p>' if comments else ''}
        <p>Please contact HR Operations if you have any questions.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <small style="color: #94a3b8;">WorkSphere HR Management System &copy; 2026</small>
    </div>
    """
    return send_email(email, subject, html)


def notify_task_assigned(email: str, employee_name: str, task_title: str, priority: str, due_date: Optional[str] = None) -> bool:
    subject = f"WorkSphere: New Task Assigned - {task_title}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7;">New Task Assignment</h2>
        <p>Hello <strong>{employee_name}</strong>,</p>
        <p>A new internal task has been assigned to you:</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0284c7; margin: 15px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>{task_title}</strong></p>
            <p style="margin: 5px 0 0 0; color: #64748b;"><strong>Priority:</strong> {priority}</p>
            {f'<p style="margin: 5px 0 0 0; color: #64748b;"><strong>Due Date:</strong> {due_date}</p>' if due_date else ''}
        </div>
        <p>Log in to WorkSphere to review task details and update your progress.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <small style="color: #94a3b8;">WorkSphere HR Management System &copy; 2026</small>
    </div>
    """
    return send_email(email, subject, html)
