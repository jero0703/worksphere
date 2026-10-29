import pytest
from datetime import date, timedelta
from app.models.employee import EmployeeStatus


# =====================================================================
# MODULE 21: ONBOARDING SYSTEM TESTS
# =====================================================================

def test_hr_create_onboarding_task(client, hr_token, employee_token):
    # Get employee ID
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"}).json()
    emp_id = me["employee"]["id"]

    payload = {
        "employee_id": emp_id,
        "task_name": "Submit Identity Verification Documents",
        "due_date": (date.today() + timedelta(days=7)).isoformat(),
    }
    res = client.post("/api/onboarding", json=payload, headers={"Authorization": f"Bearer {hr_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["task_name"] == "Submit Identity Verification Documents"
    assert data["status"] == "PENDING"
    assert data["employee_id"] == emp_id


def test_employee_view_and_update_own_onboarding_task(client, hr_token, employee_token, employee2_token):
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"}).json()
    emp_id = me["employee"]["id"]

    # HR creates task for employee 1
    create_res = client.post(
        "/api/onboarding",
        json={"employee_id": emp_id, "task_name": "Setup Workstation & Email"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    task_id = create_res.json()["id"]

    # Employee 1 checks their own tasks
    list_res = client.get("/api/onboarding", headers={"Authorization": f"Bearer {employee_token}"})
    assert list_res.status_code == 200
    task_ids = [t["id"] for t in list_res.json()]
    assert task_id in task_ids

    # Employee 1 updates task status to COMPLETED
    patch_res = client.patch(
        f"/api/onboarding/{task_id}/status",
        json={"status": "COMPLETED"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "COMPLETED"

    # Employee 2 cannot update Employee 1's task (Forbidden)
    forbidden_res = client.patch(
        f"/api/onboarding/{task_id}/status",
        json={"status": "PENDING"},
        headers={"Authorization": f"Bearer {employee2_token}"},
    )
    assert forbidden_res.status_code == 403

    # Employee cannot delete onboarding task
    del_res = client.delete(f"/api/onboarding/{task_id}", headers={"Authorization": f"Bearer {employee_token}"})
    assert del_res.status_code == 403


def test_onboarding_summary_metrics(client, hr_token, employee_token):
    summary_res = client.get("/api/onboarding/summary", headers={"Authorization": f"Bearer {employee_token}"})
    assert summary_res.status_code == 200
    data = summary_res.json()
    assert "total_tasks" in data
    assert "completed_tasks" in data
    assert "completion_percentage" in data


def test_onboarding_pipeline_and_template_assignment(client, hr_token, employee_token):
    # Employee cannot view full company pipeline
    forbidden_pipe = client.get("/api/onboarding/pipeline", headers={"Authorization": f"Bearer {employee_token}"})
    assert forbidden_pipe.status_code == 403

    # HR can view pipeline
    hr_pipe = client.get("/api/onboarding/pipeline", headers={"Authorization": f"Bearer {hr_token}"})
    assert hr_pipe.status_code == 200
    assert isinstance(hr_pipe.json(), list)

    # Get employee ID
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"}).json()
    emp_id = me["employee"]["id"]

    # HR assigns standard template
    assign_res = client.post(
        "/api/onboarding/assign-template",
        json={"employee_id": emp_id},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert assign_res.status_code == 200
    assert "tasks_created" in assign_res.json()



# =====================================================================
# MODULE 22: RESIGNATION & EXIT MANAGEMENT TESTS
# =====================================================================

def test_employee_submit_and_view_resignation(client, employee_token, employee2_token, hr_token):
    payload = {
        "reason": "Relocating to another city for personal reasons",
        "notice_period": 30,
    }
    submit_res = client.post("/api/resignations", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert submit_res.status_code == 201
    res_data = submit_res.json()
    assert res_data["status"] == "PENDING"
    assert res_data["notice_period"] == 30
    resig_id = res_data["id"]

    # View list as employee
    list_res = client.get("/api/resignations", headers={"Authorization": f"Bearer {employee_token}"})
    assert list_res.status_code == 200
    assert any(r["id"] == resig_id for r in list_res.json())

    # Employee 2 cannot view Employee 1's resignation detail (Forbidden)
    get_res = client.get(f"/api/resignations/{resig_id}", headers={"Authorization": f"Bearer {employee2_token}"})
    assert get_res.status_code == 403

    # HR reviews and approves resignation
    review_res = client.patch(
        f"/api/resignations/{resig_id}/review",
        json={"status": "APPROVED", "review_comment": "Notice period accepted. Handover scheduled."},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"
    assert review_res.json()["review_comment"] == "Notice period accepted. Handover scheduled."

    # CRITICAL: Verify employee is NOT automatically deactivated!
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"}).json()
    assert me["is_active"] is True
    assert me["employee"]["status"] == EmployeeStatus.ACTIVE.value


# =====================================================================
# MODULE 23: INTERNAL ANNOUNCEMENTS SYSTEM TESTS
# =====================================================================

def test_announcements_crud_and_rbac(client, hr_token, employee_token):
    # Employee cannot create announcement
    forbidden_create = client.post(
        "/api/announcements",
        json={"title": "Unauthorized Announcement", "message": "Testing RBAC", "priority": "LOW"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert forbidden_create.status_code == 403

    # HR creates announcement
    create_res = client.post(
        "/api/announcements",
        json={
            "title": "Townhall Meeting Next Friday",
            "message": "All team members please attend the Q4 review session in Auditorium A.",
            "priority": "HIGH",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert create_res.status_code == 201
    ann_id = create_res.json()["id"]
    assert create_res.json()["priority"] == "HIGH"

    # Employee can view announcements
    list_res = client.get("/api/announcements", headers={"Authorization": f"Bearer {employee_token}"})
    assert list_res.status_code == 200
    assert any(a["id"] == ann_id for a in list_res.json())

    # HR can update announcement
    update_res = client.put(
        f"/api/announcements/{ann_id}",
        json={"priority": "URGENT"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["priority"] == "URGENT"

    # HR can delete announcement
    del_res = client.delete(f"/api/announcements/{ann_id}", headers={"Authorization": f"Bearer {hr_token}"})
    assert del_res.status_code == 204


# =====================================================================
# MODULE 24: INTERNAL TASK MANAGEMENT TESTS
# =====================================================================

def test_tasks_assignment_and_status_update(client, hr_token, employee_token, employee2_token):
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"}).json()
    emp_id = me["employee"]["id"]

    # HR creates task
    create_res = client.post(
        "/api/tasks",
        json={
            "assigned_to": emp_id,
            "title": "Migrate database indexing",
            "description": "Optimize attendance lookup queries for faster dashboards.",
            "priority": "HIGH",
            "due_date": (date.today() + timedelta(days=3)).isoformat(),
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    # Employee sees task
    list_res = client.get("/api/tasks", headers={"Authorization": f"Bearer {employee_token}"})
    assert list_res.status_code == 200
    assert any(t["id"] == task_id for t in list_res.json())

    # Employee updates task status to IN_PROGRESS
    patch_res = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"

    # Employee 2 cannot update Employee 1's task (Forbidden)
    patch_fail = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "COMPLETED"},
        headers={"Authorization": f"Bearer {employee2_token}"},
    )
    assert patch_fail.status_code == 403

    # Task metrics endpoint
    metrics_res = client.get("/api/tasks/metrics", headers={"Authorization": f"Bearer {employee_token}"})
    assert metrics_res.status_code == 200
    assert metrics_res.json()["total_tasks"] >= 1


# =====================================================================
# MODULE 25: THIRD-PARTY INTEGRATIONS & REPORT EXPORTS TESTS
# =====================================================================

def test_calendar_export_ics(client, employee_token):
    res = client.get("/api/calendar/export.ics", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    assert "text/calendar" in res.headers["content-type"]
    assert "BEGIN:VCALENDAR" in res.text
    assert "END:VCALENDAR" in res.text


def test_calendar_google_status(client, employee_token):
    res = client.get("/api/calendar/google/status", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "google_calendar"
    assert "configured" in data


def test_csv_exports_with_formula_injection_defense(client, admin_token, employee_token):
    # Test Attendance CSV export
    att_res = client.get("/api/exports/attendance.csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert att_res.status_code == 200
    assert "text/csv" in att_res.headers["content-type"]
    assert "Record ID,Employee Code,Employee Name" in att_res.text

    # Test Payroll CSV export
    pay_res = client.get("/api/exports/payroll.csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert pay_res.status_code == 200
    assert "text/csv" in pay_res.headers["content-type"]
    assert "Payroll ID,Employee Code,Employee Name" in pay_res.text

    # Test Leaves CSV export
    leave_res = client.get("/api/exports/leaves.csv", headers={"Authorization": f"Bearer {employee_token}"})
    assert leave_res.status_code == 200
    assert "text/csv" in leave_res.headers["content-type"]
    assert "Leave ID,Employee Code,Employee Name" in leave_res.text

    # Test CSV sanitization utility against malicious formula inputs
    from app.routers.exports import sanitize_csv_cell
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-2+3") == "'-2+3"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("Safe Content") == "Safe Content"


# =====================================================================
# MODULE 26: EMPLOYEE FEEDBACK SYSTEM TESTS
# =====================================================================

def test_employee_feedback_anonymous_and_named(client, employee_token, hr_token):
    # Submit anonymous feedback
    anon_payload = {
        "category": "Work Environment",
        "rating": 5,
        "message": "The new ergonomic chairs in the open office area are fantastic!",
        "is_anonymous": True,
    }
    anon_res = client.post("/api/feedback", json=anon_payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert anon_res.status_code == 201
    anon_id = anon_res.json()["id"]

    # When HR inspects feedback, submitter is protected as Anonymous Contributor
    hr_list = client.get("/api/feedback", headers={"Authorization": f"Bearer {hr_token}"})
    assert hr_list.status_code == 200
    matched = next((f for f in hr_list.json() if f["id"] == anon_id), None)
    assert matched is not None
    assert matched["submitter_display"] == "Anonymous Contributor"
    assert matched["department_display"] == "Confidential"

    # HR responds to feedback
    resp_res = client.patch(
        f"/api/feedback/{anon_id}/status",
        json={"status": "ACKNOWLEDGED", "hr_response": "Thank you for the positive feedback!"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "ACKNOWLEDGED"

    # HR checks feedback metrics
    metrics_res = client.get("/api/feedback/metrics", headers={"Authorization": f"Bearer {hr_token}"})
    assert metrics_res.status_code == 200
    assert metrics_res.json()["total_feedbacks"] >= 1


# =====================================================================
# MODULE 27: PROFILE & SETTINGS MANAGEMENT TESTS
# =====================================================================

def test_profile_view_and_permitted_update(client, employee_token):
    # Get profile
    profile_res = client.get("/api/profile", headers={"Authorization": f"Bearer {employee_token}"})
    assert profile_res.status_code == 200
    data = profile_res.json()
    assert data["role"] == "EMPLOYEE"
    assert "settings" in data

    # Update permitted self-service fields
    update_res = client.put(
        "/api/profile",
        json={"phone": "+1-800-555-0199", "address": "123 Tech Park, Suite 400", "emergency_contact": "Jane Doe (+1-800-555-0100)"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert update_res.status_code == 200
    up_data = update_res.json()
    assert up_data["phone"] == "+1-800-555-0199"
    assert up_data["address"] == "123 Tech Park, Suite 400"
    assert up_data["emergency_contact"] == "Jane Doe (+1-800-555-0100)"


def test_password_change_flow(client, employee2_token):
    # Attempt change with wrong current password
    fail_res = client.post(
        "/api/profile/change-password",
        json={"current_password": "WrongPassword!", "new_password": "BrandNewPassword123!"},
        headers={"Authorization": f"Bearer {employee2_token}"},
    )
    assert fail_res.status_code == 400

    # Successful change
    succ_res = client.post(
        "/api/profile/change-password",
        json={"current_password": "Emp@123", "new_password": "BrandNewPassword123!"},
        headers={"Authorization": f"Bearer {employee2_token}"},
    )
    assert succ_res.status_code == 200
    assert succ_res.json()["message"] == "Password changed successfully"

    # Verify login with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": "test_employee2@worksphere.com", "password": "BrandNewPassword123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_user_settings_update(client, employee_token):
    # Update preferences
    put_res = client.put(
        "/api/profile/settings",
        json={"email_notifications": False, "theme": "dark", "announcement_alerts": True},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["email_notifications"] is False
    assert data["theme"] == "dark"
    assert data["announcement_alerts"] is True
