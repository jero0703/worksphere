def test_register_employee_success(client):
    payload = {
        "username": "alice_williams",
        "email": "alice@worksphere.com",
        "password": "Password123!",
        "full_name": "Alice Williams",
        "department": "Design",
        "designation": "UI/UX Designer",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@worksphere.com"
    assert data["user"]["role"] == "EMPLOYEE"
    assert data["user"]["employee"]["full_name"] == "Alice Williams"


def test_register_duplicate_email(client):
    payload = {
        "username": "duplicate_user",
        "email": "test_employee@worksphere.com",
        "password": "Password123!",
        "full_name": "Duplicate User",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_register_duplicate_username(client):
    payload = {
        "username": "test_employee",
        "email": "different_email@worksphere.com",
        "password": "Password123!",
        "full_name": "Duplicate Username",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "Username is already taken" in response.json()["detail"]


def test_login_success(client):
    payload = {
        "email": "test_employee@worksphere.com",
        "password": "Emp@123",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_employee@worksphere.com"
    assert data["user"]["role"] == "EMPLOYEE"


def test_login_invalid_password(client):
    payload = {
        "email": "test_employee@worksphere.com",
        "password": "WrongPassword!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_invalid_email(client):
    payload = {
        "email": "nonexistent@worksphere.com",
        "password": "Password123!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


def test_get_me_authenticated(client, employee_token):
    headers = {"Authorization": f"Bearer {employee_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test_employee@worksphere.com"
    assert data["role"] == "EMPLOYEE"
    assert data["employee"]["employee_code"] == "EMP-9003"


def test_get_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_admin_list_users_authorized(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


def test_employee_cannot_list_users(client, employee_token):
    headers = {"Authorization": f"Bearer {employee_token}"}
    response = client.get("/api/users", headers=headers)
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]
