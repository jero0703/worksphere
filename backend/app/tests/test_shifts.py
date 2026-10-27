from datetime import date, datetime, time, timedelta
from decimal import Decimal
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.shift import Shift, EmployeeShift


def test_list_shifts(client, employee_token):
    res = client.get("/api/shifts", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    shifts = res.json()
    assert len(shifts) >= 3

    shift_names = [s["name"] for s in shifts]
    assert "Morning Shift" in shift_names
    assert "Night Shift" in shift_names

    night_shift = next(s for s in shifts if s["name"] == "Night Shift")
    assert night_shift["is_overnight"] is True
    assert night_shift["duration_hours"] == 8.0


def test_create_shift_permissions_and_validation(client, admin_token, employee_token):
    # Employee cannot create shifts
    emp_res = client.post(
        "/api/shifts",
        json={"name": "Forbidden Shift", "start_time": "10:00:00", "end_time": "18:00:00"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert emp_res.status_code == 403

    # Admin can create shifts
    admin_res = client.post(
        "/api/shifts",
        json={
            "name": "Custom Weekend Shift",
            "start_time": "08:00:00",
            "end_time": "16:00:00",
            "description": "Weekend coverage",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_res.status_code == 201
    created = admin_res.json()
    assert created["name"] == "Custom Weekend Shift"
    assert created["duration_hours"] == 8.0
    assert created["is_overnight"] is False

    # Duplicate name should fail
    dup_res = client.post(
        "/api/shifts",
        json={"name": "Custom Weekend Shift", "start_time": "08:00:00", "end_time": "16:00:00"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]


def test_update_and_deactivate_shift(client, admin_token):
    # Update shift description
    shifts_res = client.get("/api/shifts", headers={"Authorization": f"Bearer {admin_token}"})
    morning_shift = next(s for s in shifts_res.json() if s["name"] == "Morning Shift")

    update_res = client.put(
        f"/api/shifts/{morning_shift['id']}",
        json={"description": "Updated Morning Shift description"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["description"] == "Updated Morning Shift description"

    # Soft delete (deactivation) when assigned to employees
    del_res = client.delete(
        f"/api/shifts/{morning_shift['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200
    assert "deactivated" in del_res.json()["message"]


def test_assign_shift_to_employee(client, hr_token, db_session):
    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-9003").first()
    night_shift = db_session.query(Shift).filter(Shift.name == "Night Shift").first()

    assign_payload = {
        "employee_id": emp.id,
        "shift_id": night_shift.id,
        "effective_from": str(date.today()),
        "effective_to": None,
    }

    res = client.post(
        "/api/shifts/assign",
        json=assign_payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["shift_name"] == "Night Shift"
    assert data["is_overnight"] is True
    assert data["employee_id"] == emp.id


def test_employee_get_my_shift(client, employee_token):
    res = client.get("/api/shifts/my-shift", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "active_shift" in data
    assert data["employee_code"] == "EMP-9003"
    assert isinstance(data["history"], list)


def test_ownership_enforcement_on_shift_endpoints(client, employee_token, db_session):
    # Employee 2 id
    emp2 = db_session.query(Employee).filter(Employee.employee_code == "EMP-9004").first()

    # Employee 1 tries to view Employee 2's shift details -> 403
    res = client.get(
        f"/api/shifts/employee/{emp2.id}",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 403
    assert "only access your own" in res.json()["detail"]


def test_shift_aware_checkin_and_checkout_early_departure(client, employee_token, db_session):
    # Check-in
    in_res = client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee_token}"})
    assert in_res.status_code == 200
    in_data = in_res.json()
    assert in_data["attendance"]["shift_id"] is not None

    # Check-out before shift ends (early departure)
    out_res = client.post("/api/attendance/check-out", headers={"Authorization": f"Bearer {employee_token}"})
    assert out_res.status_code == 200
    out_data = out_res.json()
    assert out_data["is_early_departure"] is True
    assert out_data["early_departure_minutes"] > 0
    assert "Early departure recorded" in out_data["message"]


def test_process_attendance_automated(client, admin_token):
    res = client.post(
        "/api/shifts/process-attendance?force=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "marked_absent_count" in data
    assert "Processed auto-absence" in data["details"]


def test_delete_shift_assignment(client, admin_token, db_session):
    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-9003").first()
    night_shift = db_session.query(Shift).filter(Shift.name == "Night Shift").first()

    # Create assignment
    assign_res = client.post(
        "/api/shifts/assign",
        json={
            "employee_id": emp.id,
            "shift_id": night_shift.id,
            "effective_from": str(date.today()),
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert assign_res.status_code == 201
    assignment_id = assign_res.json()["id"]

    # Delete assignment
    del_res = client.delete(
        f"/api/shifts/assignments/{assignment_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200
    assert "removed successfully" in del_res.json()["message"]


def test_creating_shift_does_not_affect_unassigned_employee(client, admin_token, db_session):
    from app.services.shift_service import get_active_shift_for_employee

    # Create an employee without any shift assignment
    unassigned_emp = Employee(
        user_id=None,
        employee_code="EMP-UNASSIGNED",
        full_name="Unassigned Person",
        designation="Contractor",
        department="General",
        joining_date=date.today(),
        salary=Decimal("50000.00"),
    )
    db_session.add(unassigned_emp)
    db_session.commit()

    # Verify active shift is None (never automatically assigned)
    assert get_active_shift_for_employee(db_session, unassigned_emp.id) is None

    # Now create a new shift via API
    res = client.post(
        "/api/shifts",
        json={"name": "Early Bird Shift", "start_time": "05:00:00", "end_time": "13:00:00"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201

    # Employee must STILL have None (creating a shift does NOT automatically change employee's shift)
    assert get_active_shift_for_employee(db_session, unassigned_emp.id) is None
