from app.models.user import User
from app.core.permissions import UserRole


def test_employee_cannot_access_admin_user_list(client, employee_token):
    res = client.get("/api/users", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_hr_cannot_access_admin_user_list(client, hr_token):
    res = client.get("/api/users", headers={"Authorization": f"Bearer {hr_token}"})
    assert res.status_code == 403
    assert "Requires ADMIN role" in res.json()["detail"]


def test_employee_cannot_view_all_attendance(client, employee_token):
    res = client.get("/api/attendance", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403


def test_employee_cannot_view_all_payroll(client, employee_token):
    res = client.get("/api/payroll", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403


def test_employee_cannot_generate_payroll(client, employee_token):
    res = client.post("/api/payroll/generate", json={"employee_id": 3, "month": "2026-10"}, headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403


def test_employee_cannot_view_another_employee_payroll(client, employee_token, admin_token, db_session):
    # Admin generates payroll for employee 2 (ID: 4)
    gen_res = client.post(
        "/api/payroll/generate",
        json={"employee_id": 4, "month": "2026-09", "basic_salary": 55000.0},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert gen_res.status_code == 201
    payroll_id = gen_res.json()["id"]

    # Employee 1 tries to access Employee 2's payroll
    res = client.get(f"/api/payroll/{payroll_id}", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403
    assert "only access your own personal records" in res.json()["detail"]


def test_live_account_deactivation_blocks_old_jwt(client, employee_token, db_session):
    # Verify employee can access /api/auth/me
    res1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert res1.status_code == 200

    # Deactivate employee in database directly
    emp_user = db_session.query(User).filter(User.email == "test_employee@worksphere.com").first()
    emp_user.is_active = False
    db_session.commit()

    # Old JWT token should immediately be blocked on subsequent request
    res2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert res2.status_code == 403
    assert "Inactive user account" in res2.json()["detail"]

    # Restore active status
    emp_user.is_active = True
    db_session.commit()


def test_live_role_demotion_blocks_old_jwt(client, hr_token, db_session):
    # HR accesses HR attendance summary
    res1 = client.get("/api/attendance/summary", headers={"Authorization": f"Bearer {hr_token}"})
    assert res1.status_code == 200

    # Demote HR to EMPLOYEE in database
    hr_user = db_session.query(User).filter(User.email == "test_hr@worksphere.com").first()
    hr_user.role = UserRole.EMPLOYEE
    db_session.commit()

    # Old HR JWT should now fail when accessing HR endpoint
    res2 = client.get("/api/attendance/summary", headers={"Authorization": f"Bearer {hr_token}"})
    assert res2.status_code == 403

    # Restore HR role
    hr_user.role = UserRole.HR
    db_session.commit()


def test_public_registration_cannot_assign_privileged_roles(client):
    res = client.post(
        "/api/auth/register",
        json={
            "username": "hacker_user",
            "email": "hacker@worksphere.com",
            "password": "Password123!",
            "full_name": "Hacker User",
            "role": "ADMIN",  # Attempting privilege escalation
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "EMPLOYEE"  # Role is strictly enforced as EMPLOYEE
