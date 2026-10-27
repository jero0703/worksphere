import io
from datetime import date, timedelta
from app.models.employee import Employee
from app.models.notification import Notification


def test_leave_calendar_endpoint(client, employee_token, hr_token):
    # Employee views team leave calendar
    res = client.get(
        "/api/leaves/calendar",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "events" in data
    assert "conflicts" in data
    assert "total_active_employees" in data
    assert "on_leave_today" in data
    assert "available_today" in data
    assert "department_summary" in data


def test_documents_management_lifecycle(client, employee_token, hr_token, db_session):
    # 1. Employee uploads their own document
    file_content = b"%PDF-1.4 test document content for WorkSphere HRMS"
    files = {"file": ("offer_letter.pdf", file_content, "application/pdf")}
    data = {"document_type": "Contract", "description": "Signed employment agreement"}

    upload_res = client.post(
        "/api/documents/upload",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert upload_res.status_code == 201
    doc = upload_res.json()
    assert doc["file_name"] == "offer_letter.pdf"
    assert doc["document_type"] == "Contract"
    doc_id = doc["id"]

    # 2. Employee lists documents - should contain the uploaded document
    list_res = client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(d["id"] == doc_id for d in items)

    # 3. Employee downloads the document
    download_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert download_res.status_code == 200
    assert download_res.content == file_content

    # 4. Employee cannot upload with unsupported extension
    bad_files = {"file": ("malicious.exe", b"content", "application/octet-stream")}
    bad_res = client.post(
        "/api/documents/upload",
        files=bad_files,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert bad_res.status_code == 400
    assert "Unsupported file format" in bad_res.json()["detail"]

    # 5. Delete document
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert del_res.status_code == 200


def test_performance_management_crud_and_rbac(client, employee_token, hr_token, db_session):
    emp = db_session.query(Employee).first()
    assert emp is not None

    # 1. Employee cannot submit a performance review (403)
    emp_create = client.post(
        "/api/performance",
        json={
            "employee_id": emp.id,
            "review_period": "Q1 2026",
            "rating": 4.8,
            "feedback": "Self evaluation should be blocked",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert emp_create.status_code == 403

    # 2. Invalid rating (> 5.0) rejected
    invalid_rating = client.post(
        "/api/performance",
        json={
            "employee_id": emp.id,
            "review_period": "Q1 2026",
            "rating": 6.5,
            "feedback": "Outstanding beyond max",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert invalid_rating.status_code == 422 or invalid_rating.status_code == 400

    # 3. HR creates performance review
    create_res = client.post(
        "/api/performance",
        json={
            "employee_id": emp.id,
            "review_period": "Q1 2026",
            "rating": 4.5,
            "feedback": "Exceeded all engineering benchmarks and helped mentor interns.",
            "goals": "Achieve AWS Solutions Architect certification.",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert create_res.status_code == 201
    created_review = create_res.json()
    review_id = created_review["id"]
    assert created_review["rating"] == 4.5
    assert created_review["review_period"] == "Q1 2026"

    # 4. HR gets performance summary
    summary_res = client.get(
        "/api/performance/summary",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_reviews"] >= 1
    assert summary["average_rating"] > 0

    # 5. HR updates review
    update_res = client.put(
        f"/api/performance/{review_id}",
        json={"rating": 4.7, "feedback": "Updated: Exceptional performance across all quarters."},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["rating"] == 4.7

    # 6. HR deletes review
    del_res = client.delete(
        f"/api/performance/{review_id}",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert del_res.status_code == 200


def test_analytics_dashboard_and_csv_exports(client, employee_token, hr_token):
    # 1. Employee cannot view executive analytics (403)
    emp_res = client.get(
        "/api/analytics/dashboard",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert emp_res.status_code == 403

    # 2. HR views executive analytics dashboard
    hr_res = client.get(
        "/api/analytics/dashboard",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert hr_res.status_code == 200
    data = hr_res.json()
    assert "summary" in data
    assert "attendance_trends" in data
    assert "department_metrics" in data
    assert "leave_distribution" in data

    # 3. Export Attendance CSV
    att_csv = client.get(
        "/api/analytics/export/attendance",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert att_csv.status_code == 200
    assert "text/csv" in att_csv.headers["content-type"]
    assert "Employee Code" in att_csv.text

    # 4. Export Leaves CSV
    leave_csv = client.get(
        "/api/analytics/export/leaves",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert leave_csv.status_code == 200
    assert "text/csv" in leave_csv.headers["content-type"]
    assert "Leave ID" in leave_csv.text

    # 5. Export Payroll CSV
    pay_csv = client.get(
        "/api/analytics/export/payroll",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert pay_csv.status_code == 200
    assert "text/csv" in pay_csv.headers["content-type"]
    assert "Payroll ID" in pay_csv.text


def test_smart_notifications_system(client, employee_token, hr_token, db_session):
    # 1. Get notifications
    res = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 200
    items = res.json()

    # 2. Get unread count
    cnt_res = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert cnt_res.status_code == 200
    assert "unread_count" in cnt_res.json()

    # 3. Mark all as read
    read_all = client.patch(
        "/api/notifications/read-all",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert read_all.status_code == 200


def test_employee_search_and_profile_api(client, employee_token, hr_token, db_session):
    # 1. Employee cannot search employee directory (403)
    emp_res = client.get(
        "/api/employees/search",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert emp_res.status_code == 403

    # 2. HR searches employee directory
    search_res = client.get(
        "/api/employees/search?page=1&page_size=10",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert search_res.status_code == 200
    data = search_res.json()
    assert "items" in data
    assert "total" in data
    assert "departments" in data
    assert "designations" in data

    if data["items"]:
        first_emp_id = data["items"][0]["id"]
        # 3. Get full employee profile
        profile_res = client.get(
            f"/api/employees/{first_emp_id}/profile",
            headers={"Authorization": f"Bearer {hr_token}"},
        )
        assert profile_res.status_code == 200
        prof = profile_res.json()
        assert "employee_code" in prof
        assert "full_name" in prof
        assert "recent_attendance" in prof
        assert "documents" in prof
        assert "performances" in prof
