def test_admin_create_user_with_role(client, admin_token):
    payload = {
        "username": "charlie_brown",
        "email": "charlie@worksphere.com",
        "password": "Password123!",
        "role": "HR",
        "full_name": "Charlie Brown",
        "department": "People Ops",
        "designation": "HR Specialist",
        "salary": 65000.0,
    }
    res = client.post("/api/users", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "charlie_brown"
    assert data["role"] == "HR"
    assert data["employee"]["full_name"] == "Charlie Brown"


def test_admin_update_user(client, admin_token):
    # Self-contained: create user first
    payload = {
        "username": "lucy_vanpelt",
        "email": "lucy@worksphere.com",
        "password": "Password123!",
        "role": "EMPLOYEE",
        "full_name": "Lucy Van Pelt",
        "department": "Design",
        "designation": "Designer",
        "salary": 60000.0,
    }
    create_res = client.post("/api/users", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    update_payload = {
        "full_name": "Lucy Van Pelt Senior",
        "designation": "Lead Designer",
    }
    res = client.put(f"/api/users/{user_id}", json=update_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["employee"]["full_name"] == "Lucy Van Pelt Senior"


def test_prevent_deactivating_last_admin(client, admin_token):
    # Query admin user ID
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_id = me["id"]

    # Attempt to deactivate the only active admin
    res = client.patch(
        f"/api/users/{admin_id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert "Cannot deactivate the last remaining active Administrator" in res.json()["detail"]


def test_prevent_demoting_last_admin(client, admin_token):
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_id = me["id"]

    # Attempt to demote the only active admin
    res = client.patch(
        f"/api/users/{admin_id}/role",
        json={"role": "EMPLOYEE"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert "Cannot demote the last remaining active Administrator" in res.json()["detail"]


def test_prevent_deleting_last_admin(client, admin_token):
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_id = me["id"]

    res = client.delete(f"/api/users/{admin_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "Cannot delete the last remaining active Administrator" in res.json()["detail"]
