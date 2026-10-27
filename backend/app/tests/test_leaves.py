from datetime import date, timedelta
from decimal import Decimal
from app.models.leave import LeaveBalance, LeaveType
from app.models.employee import Employee


def test_leave_policies_and_balances(client, employee_token):
    # View policies
    res_pol = client.get("/api/leaves/policies", headers={"Authorization": f"Bearer {employee_token}"})
    assert res_pol.status_code == 200
    policies = res_pol.json()
    assert len(policies) == 3

    # View employee balances
    res_bal = client.get("/api/leaves/balances/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert res_bal.status_code == 200
    balances = res_bal.json()
    assert len(balances) == 3
    sick = next(b for b in balances if b["leave_type"] == "SICK")
    assert float(sick["remaining_days"]) == 10.0


def test_apply_leave_exceeding_balance_fails(client, employee_token):
    # Try to request 30 days of sick leave (exceeds balance of 10)
    start = date.today() + timedelta(days=10)
    end = start + timedelta(days=45)
    payload = {
        "leave_type": "SICK",
        "start_date": str(start),
        "end_date": str(end),
        "reason": "Requesting extensive recovery leave",
    }
    res = client.post("/api/leaves", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 400
    assert "Insufficient leave balance" in res.json()["detail"]


def test_apply_and_approve_leave_deducts_balance(client, employee_token, hr_token, db_session):
    start = date.today() + timedelta(days=60)
    end = start + timedelta(days=2)  # 3 days leave

    payload = {
        "leave_type": "CASUAL",
        "start_date": str(start),
        "end_date": str(end),
        "reason": "Family function and travel",
    }
    res_apply = client.post("/api/leaves", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert res_apply.status_code == 201
    leave_id = res_apply.json()["id"]
    days_req = res_apply.json()["days_requested"]

    # Initial CASUAL balance was 12.0
    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-9003").first()
    bal_before = db_session.query(LeaveBalance).filter(LeaveBalance.employee_id == emp.id, LeaveBalance.leave_type == LeaveType.CASUAL).first()
    assert float(bal_before.remaining_days) == 12.0

    # HR approves the leave
    res_app = client.patch(
        f"/api/leaves/{leave_id}/approve",
        json={"status": "APPROVED", "review_comment": "Approved. Enjoy your time off."},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "APPROVED"
    assert res_app.json()["is_balance_deducted"] is True

    # Balance must be deducted
    db_session.refresh(bal_before)
    expected_remaining = Decimal("12.0") - Decimal(str(days_req))
    assert bal_before.remaining_days == expected_remaining

    # Duplicate approval attempt cannot re-deduct
    res_dup = client.patch(
        f"/api/leaves/{leave_id}/approve",
        json={"status": "APPROVED"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res_dup.status_code == 400
    assert "already approved" in res_dup.json()["detail"]


def test_overlapping_leave_prevention(client, employee_token):
    start = date.today() + timedelta(days=120)
    end = start + timedelta(days=3)

    # First leave application
    payload1 = {
        "leave_type": "CASUAL",
        "start_date": str(start),
        "end_date": str(end),
        "reason": "First leave application",
    }
    res1 = client.post("/api/leaves", json=payload1, headers={"Authorization": f"Bearer {employee_token}"})
    assert res1.status_code == 201

    # Attempt to request overlapping dates
    payload2 = {
        "leave_type": "SICK",
        "start_date": str(start + timedelta(days=1)),
        "end_date": str(end + timedelta(days=2)),
        "reason": "Attempting overlapping leave",
    }
    res2 = client.post("/api/leaves", json=payload2, headers={"Authorization": f"Bearer {employee_token}"})
    assert res2.status_code == 400
    assert "Overlapping leave request already exists" in res2.json()["detail"]


def test_cancel_approved_leave_restores_balance(client, employee_token, hr_token, db_session):
    start = date.today() + timedelta(days=90)
    end = start + timedelta(days=1)

    payload = {
        "leave_type": "PAID",
        "start_date": str(start),
        "end_date": str(end),
        "reason": "Summer vacation",
    }
    res_apply = client.post("/api/leaves", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert res_apply.status_code == 201
    leave_id = res_apply.json()["id"]

    # HR approves
    client.patch(f"/api/leaves/{leave_id}/approve", headers={"Authorization": f"Bearer {hr_token}"})

    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-9003").first()
    bal = db_session.query(LeaveBalance).filter(LeaveBalance.employee_id == emp.id, LeaveBalance.leave_type == LeaveType.PAID).first()
    assert float(bal.remaining_days) < 18.0

    # Employee cancels
    res_cancel = client.patch(f"/api/leaves/{leave_id}/cancel", headers={"Authorization": f"Bearer {employee_token}"})
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"

    # Balance must be restored to 18.0
    db_session.refresh(bal)
    assert float(bal.remaining_days) == 18.0
