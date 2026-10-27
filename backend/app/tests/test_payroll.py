def test_generate_payroll_and_calculation(client, admin_token):
    # Employee 1 (EMP-9003)
    payload = {
        "employee_id": 3,
        "month": "2026-08",
        "basic_salary": 60000.0,
        "allowances": 5000.0,
        "bonus": 2500.0,
        "deductions": 3500.0,
        "payment_method": "Direct Deposit",
        "notes": "August 2026 Monthly Payroll",
    }
    # Expected Net = 60000 + 5000 + 2500 - 3500 = 64000
    res = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    data = res.json()
    assert float(data["net_salary"]) == 64000.0
    assert float(data["allowances"]) == 5000.0
    assert float(data["bonus"]) == 2500.0
    assert float(data["deductions"]) == 3500.0
    assert data["status"] == "PAID"


def test_duplicate_payroll_for_same_month_prevented(client, admin_token):
    payload = {
        "employee_id": 3,
        "month": "2026-05",
        "basic_salary": 60000.0,
    }
    # First generation succeeds
    res1 = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res1.status_code == 201

    # Second generation for same employee and month is rejected
    res2 = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 400
    assert "already been generated" in res2.json()["detail"]


def test_negative_amounts_rejected(client, admin_token):
    payload = {
        "employee_id": 3,
        "month": "2026-07",
        "basic_salary": 60000.0,
        "deductions": -500.0,
    }
    res = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 422  # Pydantic validation error


def test_deductions_exceeding_earnings_rejected(client, admin_token):
    payload = {
        "employee_id": 3,
        "month": "2026-06",
        "basic_salary": 5000.0,
        "deductions": 10000.0,
    }
    res = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "Deductions" in res.json()["detail"]


def test_monthly_payroll_summary(client, admin_token):
    # Generate a record first
    payload = {
        "employee_id": 3,
        "month": "2026-04",
        "basic_salary": 60000.0,
        "allowances": 2000.0,
        "bonus": 1000.0,
        "deductions": 3000.0,
    }
    res_gen = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_gen.status_code == 201

    res = client.get("/api/payroll/summary?month=2026-04", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["month"] == "2026-04"
    assert data["total_records"] >= 1
    assert float(data["total_net_salary"]) == 60000.0


def test_download_payslip_pdf(client, employee_token, admin_token):
    # Admin generates payroll for employee (ID: 3)
    payload = {
        "employee_id": 3,
        "month": "2026-03",
        "basic_salary": 60000.0,
    }
    gen_res = client.post("/api/payroll/generate", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert gen_res.status_code == 201
    payroll_id = gen_res.json()["id"]

    # Employee downloads their own payslip
    res_pdf = client.get(f"/api/payroll/{payroll_id}/payslip", headers={"Authorization": f"Bearer {employee_token}"})
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")
