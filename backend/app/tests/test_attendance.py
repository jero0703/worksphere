from datetime import date, datetime, timedelta
from app.models.attendance import Attendance
from app.models.employee import Employee


def test_check_in_and_duplicate_prevention(client, employee_token):
    # First check-in succeeds
    res1 = client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee_token}"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert "Check-in successful" in data1["message"]
    assert data1["attendance"]["status"] == "PRESENT"
    assert data1["attendance"]["date"] == str(date.today())

    # Duplicate check-in on the same day is rejected
    res2 = client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee_token}"})
    assert res2.status_code == 400
    assert "Check-in already recorded for today" in res2.json()["detail"]


def test_check_out_and_working_hours(client, employee2_token, db_session):
    # Check-out without check-in fails
    res_fail = client.post("/api/attendance/check-out", headers={"Authorization": f"Bearer {employee2_token}"})
    assert res_fail.status_code == 400
    assert "Cannot check out without an active check-in" in res_fail.json()["detail"]

    # Check-in employee 2
    res_in = client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee2_token}"})
    assert res_in.status_code == 200

    # Backdate the check-in time 8.5 hours ago to test working hours & overtime calculation
    emp2 = db_session.query(Employee).filter(Employee.employee_code == "EMP-9004").first()
    att = db_session.query(Attendance).filter(Attendance.employee_id == emp2.id, Attendance.date == date.today()).first()
    att.check_in = datetime.now() - timedelta(hours=8, minutes=30)
    db_session.commit()

    # Check-out succeeds and computes working hours and overtime
    res_out = client.post("/api/attendance/check-out", headers={"Authorization": f"Bearer {employee2_token}"})
    assert res_out.status_code == 200
    data_out = res_out.json()
    assert float(data_out["working_hours"]) >= 8.4
    assert float(data_out["overtime_hours"]) >= 0.4
    assert data_out["attendance"]["status"] == "PRESENT"

    # Repeated check-out fails
    res_repeat = client.post("/api/attendance/check-out", headers={"Authorization": f"Bearer {employee2_token}"})
    assert res_repeat.status_code == 400
    assert "Check-out already completed for today" in res_repeat.json()["detail"]


def test_get_personal_attendance_history(client, employee_token):
    # Ensure check-in exists first
    client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee_token}"})

    res = client.get("/api/attendance/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_attendance_summary(client, hr_token):
    res = client.get("/api/attendance/summary", headers={"Authorization": f"Bearer {hr_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_active_employees" in data
    assert "present_count" in data
    assert "attendance_rate" in data


def test_authorized_attendance_correction(client, employee_token, admin_token, db_session):
    # Check-in employee first
    client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {employee_token}"})

    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-9003").first()
    att = db_session.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == date.today()).first()
    assert att is not None

    correction_payload = {
        "status": "HALF_DAY",
        "correction_notes": "Employee left early with manager permission for medical appointment",
    }
    res = client.patch(
        f"/api/attendance/{att.id}/correct",
        json=correction_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HALF_DAY"
    assert "medical appointment" in data["correction_notes"]


def test_auto_absence_processing(client, admin_token):
    past_date = date.today() - timedelta(days=3)
    res = client.post(
        f"/api/attendance/process-daily-absent?target_date={past_date}&force=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "marked_absent_count" in data
    assert data["marked_absent_count"] >= 0
