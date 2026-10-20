# WorkSphere – HR Management System (HRMS)

An enterprise-grade, full-stack Human Resource Management System built with **FastAPI**, **React (Vite)**, and **MySQL**. WorkSphere provides role-based access for Employees, HR Managers, and Administrators to streamline personnel records, attendance, leaves, payroll, notifications, and organizational analytics.

---

## 🚀 Technology Stack

### Backend
- **Python 3.11+ / 3.13**
- **FastAPI** – High performance, asynchronous web framework
- **SQLAlchemy 2.0 ORM** – Relational database modeling and queries
- **MySQL 8.0** with **PyMySQL**
- **Pydantic v2 & Pydantic-Settings** – Schema validation and environment management
- **Argon2 Password Hashing (`argon2-cffi`)** – State-of-the-art cryptographic password hashing
- **PyJWT** – JSON Web Tokens with expiration and role claims
- **Alembic** – Production database migrations
- **Pytest & TestClient** – Automated unit & integration testing
- **Uvicorn** – ASGI web server

### Frontend
- **React 19** with **Vite**
- **Tailwind CSS v4** – Modern responsive SaaS styling
- **React Router DOM v7** – Protected client-side routing & role redirection
- **Axios** – HTTP client with request/response JWT interceptors
- **React Hook Form** – Form validation and state management
- **Lucide React** – Consistent icon set
- **Recharts** – Enterprise data visualization and analytics

---

## 📂 Architecture & Folder Structure

```
WorkSphere/
│
├── backend/
│   ├── alembic/                      # Database migration scripts
│   │   ├── versions/                 # Version migration files
│   │   └── env.py
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Settings & database URL resolver
│   │   │   ├── security.py           # Argon2 hashing & JWT encoding/decoding
│   │   │   └── permissions.py        # Role hierarchy & permission checkers
│   │   ├── db/
│   │   │   ├── base.py               # DeclarativeBase
│   │   │   ├── database.py           # Engine & SessionLocal
│   │   │   └── init_db.py            # Table creation & initial seeds
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── user.py               # User authentication model
│   │   │   ├── employee.py           # Employee profile model
│   │   │   ├── attendance.py         # Attendance & check-in model
│   │   │   ├── leave.py              # Leave request & approvals model
│   │   │   ├── payroll.py            # Salary calculation & payslip model
│   │   │   └── notification.py       # User notifications model
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   │   ├── auth.py               # Login, register & token schemas
│   │   │   └── user.py               # User response & profile schemas
│   │   ├── routers/                  # API endpoints
│   │   │   ├── auth.py               # Register, login, me, logout
│   │   │   └── users.py              # Admin user & role management
│   │   ├── services/                 # Business logic
│   │   │   └── auth_service.py       # Authentication & registration logic
│   │   ├── dependencies/             # Reusable FastAPI dependencies
│   │   │   ├── auth.py               # get_current_user, token validation
│   │   │   └── permissions.py        # require_role, require_admin, require_hr
│   │   ├── tests/                    # Pytest test suite
│   │   │   ├── conftest.py           # Test database & authentication fixtures
│   │   │   └── test_auth.py          # Auth & RBAC unit tests
│   │   └── main.py                   # FastAPI application factory & CORS
│   ├── alembic.ini                   # Alembic configuration
│   ├── pytest.ini                    # Pytest configuration
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment template
│   └── .env                          # Local database & JWT credentials
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js              # Axios instance with JWT interceptors
│   │   │   ├── authApi.js            # Auth API calls
│   │   │   └── userApi.js            # User management API calls
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global authentication state & session
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.jsx    # Guard for authenticated users
│   │   │   └── RoleRoute.jsx         # Guard for role-specific routes
│   │   ├── layouts/
│   │   │   ├── AuthLayout.jsx        # Login & registration layout
│   │   │   └── AppLayout.jsx         # Sidebar, topbar & content layout
│   │   ├── components/layout/
│   │   │   ├── Navbar.jsx            # Top bar with role badge & user avatar
│   │   │   └── Sidebar.jsx           # Responsive role-aware sidebar
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx         # Sign in with quick-switch demo logins
│   │   │   │   ├── Register.jsx      # Employee self-registration
│   │   │   │   ├── Unauthorized.jsx  # 403 Access denied view
│   │   │   │   └── AdminUsers.jsx    # Admin role assignment & user activation
│   │   │   └── dashboards/
│   │   │       ├── RoleRedirect.jsx  # Automatic routing by role
│   │   │       ├── EmployeeDashboard.jsx # Employee portal
│   │   │       ├── HrDashboard.jsx   # HR management portal
│   │   │       └── AdminDashboard.jsx# Administrator console
│   │   ├── App.jsx                   # Route hierarchy
│   │   ├── main.jsx                  # React DOM root
│   │   └── index.css                 # Tailwind CSS styles
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── .env
│
└── README.md
```

---

## 🔑 Pre-seeded Baseline Accounts

The database comes pre-seeded with three default accounts for testing:

| Role | Email | Password | Username | Full Name | Department |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@worksphere.com` | `Admin@123` | `admin` | System Administrator | Executive |
| **HR** | `hr@worksphere.com` | `Hr@123` | `hrmanager` | Sarah Jenkins | Human Resources |
| **EMPLOYEE** | `employee@worksphere.com` | `Emp@123` | `john_doe` | John Doe | Engineering |

> [!TIP]
> The login screen contains **one-click demo login buttons** to instantly populate credentials for any role.

---

## ⚙️ Installation & Running the Project (Windows PowerShell)

### 1. Database Setup (MySQL)
Ensure your local MySQL service is running. Create the database:
```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS worksphere_db;"
```

### 2. Backend Setup
1. Open PowerShell and navigate to the `backend` folder:
```powershell
cd c:\Users\Jero\Desktop\stackly\WorkSphere\backend
```

2. Create and activate a Python virtual environment:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

3. Install required packages:
```powershell
pip install -r requirements.txt
```

4. Configure `.env`:
Verify `backend/.env` has your MySQL credentials:
```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/worksphere_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=worksphere_db
JWT_SECRET_KEY=w0rk$ph3r3_sup3r_s3cur3_pr0duct10n_k3y_2026_jwt_t0k3n
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
FRONTEND_ORIGIN=http://localhost:5173
```

5. Run database migrations:
```powershell
alembic upgrade head
```

6. Start the FastAPI server:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

7. Run test suite:
```powershell
python -m pytest -v
```

---

### 3. Frontend Setup
1. Open a new PowerShell window and navigate to `frontend`:
```powershell
cd c:\Users\Jero\Desktop\stackly\WorkSphere\frontend
```

2. Install npm dependencies:
```powershell
npm install
```

3. Start the Vite development server:
```powershell
npm run dev
```
Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

## 📡 API Endpoints (Phase 1)

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register employee account & create employee record | Public |
| `POST` | `/api/auth/login` | Authenticate email & password, returns JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user & employee profile | Authenticated |
| `POST` | `/api/auth/logout` | Invalidate session client-side | Authenticated |

### User Management (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | List all users and employee details | **ADMIN** |
| `GET` | `/api/users/{id}` | Retrieve specific user details | **ADMIN** |
| `PATCH` | `/api/users/{id}/role` | Promote/demote user (EMPLOYEE/HR/ADMIN) | **ADMIN** |
| `PATCH` | `/api/users/{id}/status` | Activate/deactivate user account | **ADMIN** |

---

## 🛡️ Security Features Implemented
- **Argon2 Password Hashing**: Utilizes modern memory-hard password derivation via `argon2-cffi`.
- **JWT Expiration & Role Claims**: Stateless tokens with cryptographic signature, user ID, and role.
- **Privilege Escalation Protection**: Public registration strictly assigns `EMPLOYEE` role. Only administrators can promote accounts to `HR` or `ADMIN`.
- **FastAPI Role Dependencies**: Strict backend enforcement via `require_role`, `require_admin`, and `require_hr`.
- **Axios Bearer Interceptors**: Automatic Bearer header injection and 401 session expiration handling.
- **CORS Protection**: Configured strictly for configured frontend origins.

---

## 🗺️ Next Development Steps
- **Phase 2**: Employee Management (CRUD operations, directory, search, filter by department, pagination).
- **Phase 3**: Attendance Management (Check-in/out, working hours calculation, duplicate check-in prevention).
- **Phase 4**: Leave Management (Application submission, overlapping validation, HR approval/rejection).
- **Phase 5**: Payroll Processing (Salary calculation, deductions, bonuses, downloadable PDF payslips).
- **Phase 6**: Advanced Analytics Dashboards (Recharts data graphs) & Notification Center.
