# WorkSphere – HR Management System (HRMS)

An enterprise-grade, production-style full-stack Human Resource Management System built with **FastAPI**, **React (Vite)**, and **MySQL**. WorkSphere provides comprehensive role-based access control (RBAC) for Employees, HR Managers, and Administrators to manage workforce directories, attendance tracking, leave policies and balances, compensation processing, automated notifications, and organizational analytics.

---

## 🚀 Technology Stack

### Backend
- **Python 3.11+ / 3.13**
- **FastAPI** – High performance, asynchronous web framework with OpenAPI / Swagger UI
- **SQLAlchemy 2.0 ORM** – Relational database modeling with transaction management and row-level locking (`with_for_update`)
- **MySQL 8.0** with **PyMySQL**
- **Pydantic v2 & Pydantic-Settings** – Schema validation and environment management
- **Argon2 Password Hashing (`argon2-cffi`)** – Modern cryptographic password hashing
- **PyJWT** – JSON Web Tokens with live role and account status validation
- **ReportLab** – Enterprise PDF payslip generation
- **Alembic** – Production database migrations
- **Pytest & TestClient** – 73 automated unit & integration tests across Modules 1–27 (100% passing)
- **Uvicorn** – High-throughput ASGI web server

### Frontend
- **React 19** with **Vite**
- **Tailwind CSS v4** – Modern responsive SaaS styling
- **React Router DOM v7** – Protected client-side routing & role redirection
- **Axios** – HTTP client with request/response JWT interceptors & blob download handling
- **Lucide React** – Clean enterprise icon set
- **Recharts** – Enterprise visual analytics

---

## 📂 Architecture & Folder Structure

```
WorkSphere/
│
├── backend/
│   ├── alembic/                      # Database migration scripts
│   │   ├── versions/                 # Version migration files (Phase 1 & Phase 2)
│   │   └── env.py
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Settings, work hour constants & database resolver
│   │   │   ├── security.py           # Argon2 hashing & JWT encoding/decoding
│   │   │   └── permissions.py        # Role hierarchy & permission checkers
│   │   ├── db/
│   │   │   ├── base.py               # DeclarativeBase
│   │   │   ├── database.py           # Engine & SessionLocal
│   │   │   └── init_db.py            # Table creation, seeds & leave policy defaults
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── user.py               # User authentication & role model
│   │   │   ├── employee.py           # Employee profile model
│   │   │   ├── attendance.py         # Attendance, late arrival, overtime & corrections
│   │   │   ├── leave.py              # LeavePolicy, LeaveBalance, and Leave requests
│   │   │   ├── payroll.py            # Payroll ledger with allowances, bonus & deductions
│   │   │   └── notification.py       # Notification center model
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   │   ├── auth.py               # Login, register & token schemas
│   │   │   ├── user.py               # User response & admin management schemas
│   │   │   ├── attendance.py         # Check-in, check-out, correction & summary schemas
│   │   │   ├── leave.py              # Leave application, review, balance & policy schemas
│   │   │   ├── payroll.py            # Payroll generation, summary & status schemas
│   │   │   ├── notification.py       # Notification schemas
│   │   │   └── dashboard.py          # Role-specific dashboard response schemas
│   │   ├── routers/                  # API endpoints
│   │   │   ├── auth.py               # Register, login (JSON & OAuth2 token), me, logout
│   │   │   ├── users.py              # Admin user CRUD, roles, deactivation protection
│   │   │   ├── attendance.py         # Check-in/out, personal history, summary, corrections, auto-absent
│   │   │   ├── leaves.py             # Balances, policies, apply, approve/reject, cancel
│   │   │   ├── payroll.py            # Generate, list, summary, status, PDF download
│   │   │   ├── notifications.py      # User notifications, unread count, mark read
│   │   │   └── dashboard.py          # Dedicated aggregated KPI dashboards for Employee, HR & Admin
│   │   ├── services/                 # Business logic layer
│   │   │   ├── auth_service.py       # Authentication & registration logic
│   │   │   ├── attendance_service.py # Attendance rules, grace period & batch auto-absence
│   │   │   ├── leave_service.py      # Balance checks, atomic deductions & restore logic
│   │   │   ├── payroll_service.py    # Salary math & ReportLab PDF payslip generation
│   │   │   ├── notification_service.py # Automated notification dispatches
│   │   │   └── dashboard_service.py  # High-performance dashboard aggregates
│   │   ├── dependencies/             # Reusable FastAPI dependencies
│   │   │   ├── auth.py               # get_current_user with live DB validation
│   │   │   └── permissions.py        # require_role, require_admin, require_hr, verify_employee_ownership
│   │   ├── tests/                    # Pytest test suite (44/44 tests passing)
│   │   │   ├── conftest.py           # SQLite in-memory test database & auth fixtures
│   │   │   ├── test_auth.py          # Auth & registration tests
│   │   │   ├── test_rbac.py          # RBAC & ownership restriction tests
│   │   │   ├── test_attendance.py    # Attendance, check-in, checkout, late & overtime tests
│   │   │   ├── test_leaves.py        # Leave balance deduction, overlap & cancel tests
│   │   │   ├── test_payroll.py       # Payroll generation, deductions & PDF payslip tests
│   │   │   └── test_admin_users.py   # Admin user CRUD & last-admin protection tests
│   │   └── main.py                   # FastAPI application factory & router registration
│   ├── alembic.ini                   # Alembic configuration
│   ├── pytest.ini                    # Pytest configuration
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Local database & JWT credentials
│
├── frontend/
│   ├── src/
│   │   ├── api/                      # Axios API clients
│   │   │   ├── axios.js              # Interceptors with Bearer token & 401 redirect
│   │   │   ├── authApi.js            # Authentication endpoints
│   │   │   ├── userApi.js            # Admin user management
│   │   │   ├── attendanceApi.js      # Attendance & time tracking
│   │   │   ├── leaveApi.js           # Leave balances, requests & policies
│   │   │   ├── payrollApi.js         # Payroll processing & PDF download
│   │   │   ├── notificationApi.js    # Notification center & unread count
│   │   │   └── dashboardApi.js       # Live metrics for all three dashboards
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global authentication state & session
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.jsx    # Guard for authenticated users
│   │   │   └── RoleRoute.jsx         # Guard for role-specific routes
│   │   ├── layouts/
│   │   │   ├── AuthLayout.jsx        # Login & registration layout
│   │   │   └── AppLayout.jsx         # Sidebar, topbar & content layout
│   │   ├── components/layout/
│   │   │   ├── Navbar.jsx            # Top bar with dynamic unread notification badge & avatar
│   │   │   └── Sidebar.jsx           # Responsive role-aware sidebar navigation
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx         # Sign in with quick-switch demo logins
│   │   │   │   ├── Register.jsx      # Employee self-registration
│   │   │   │   ├── Unauthorized.jsx  # 403 Access denied view
│   │   │   │   └── AdminUsers.jsx    # Admin user creation modal, edit & deactivation protection
│   │   │   ├── dashboards/
│   │   │   │   ├── RoleRedirect.jsx  # Automatic routing by role
│   │   │   │   ├── EmployeeDashboard.jsx # Employee self-service workspace
│   │   │   │   ├── HrDashboard.jsx   # HR management portal with pending approvals
│   │   │   │   └── AdminDashboard.jsx# Administrator console with system metrics
│   │   │   ├── attendance/
│   │   │   │   └── AttendanceDashboard.jsx # Check-in/out, late badges, history, HR corrections
│   │   │   ├── leaves/
│   │   │   │   └── LeaveDashboard.jsx # Balance cards, apply modal, review tab, policies
│   │   │   ├── payroll/
│   │   │   │   └── PayrollDashboard.jsx # Compensation summary, generate modal, PDF download
│   │   │   └── notifications/
│   │   │       └── NotificationCenter.jsx # In-app notification center & mark as read
│   │   ├── App.jsx                   # Route hierarchy
│   │   └── main.jsx                  # React DOM root
│   ├── package.json
│   └── vite.config.js
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
WORK_START_TIME=09:00
LATE_GRACE_MINUTES=15
AUTO_ABSENT_CUTOFF_HOUR=18
```

5. Run database migrations:
```powershell
alembic upgrade head
```

6. Seed initial tables & policies:
```powershell
python -m app.db.init_db
```

7. Start the FastAPI server:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

8. Run test suite:
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

## 📡 API Endpoints Reference

### 1. Authentication & Session (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Self-register employee account (enforces EMPLOYEE role) | Public |
| `POST` | `/api/auth/login` | Authenticate email & password, returns JWT token | Public |
| `POST` | `/api/auth/token` | OAuth2 password request form for Swagger UI Authorize | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & linked employee | Authenticated |
| `POST` | `/api/auth/logout` | Client-side session termination | Authenticated |

### 2. User & Role Administration (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | List users with search and role filter | **ADMIN** |
| `POST` | `/api/users` | Create user and linked employee record | **ADMIN** |
| `GET` | `/api/users/{id}` | Get specific user details | **ADMIN** |
| `PUT` | `/api/users/{id}` | Update user & employee details | **ADMIN** |
| `PATCH` | `/api/users/{id}/role` | Promote/demote role (with last-admin protection) | **ADMIN** |
| `PATCH` | `/api/users/{id}/status` | Activate/deactivate account (with last-admin protection) | **ADMIN** |
| `DELETE` | `/api/users/{id}` | Safe deletion / auto-soft-deactivation if history exists | **ADMIN** |

### 3. Attendance Management (`/api/attendance`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/check-in` | Server-timestamped check-in; late arrival calculation | **EMPLOYEE / HR / ADMIN** |
| `POST` | `/api/attendance/check-out` | Check-out; calculates working hours & overtime | **EMPLOYEE / HR / ADMIN** |
| `GET` | `/api/attendance/me` | Personal attendance history with month filter | Authenticated |
| `GET` | `/api/attendance/status/me` | Check today's clock status | Authenticated |
| `GET` | `/api/attendance/summary` | Today's organization-wide attendance KPIs | **HR / ADMIN** |
| `GET` | `/api/attendance/all` | Organization attendance log with filters | **HR / ADMIN** |
| `POST` | `/api/attendance/correct` | Authorized record correction with audit notes | **HR / ADMIN** |
| `POST` | `/api/attendance/process-absent` | Scheduled/manual job to mark unclocked employees absent | **HR / ADMIN** |

### 4. Leave Policies & Balances (`/api/leaves`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leaves/policies` | List active organization leave policies | Authenticated |
| `PUT` | `/api/leaves/policies/{id}` | Update leave policy quota / description | **HR / ADMIN** |
| `GET` | `/api/leaves/balances/me` | Fetch personal leave balance by category | Authenticated |
| `GET` | `/api/leaves/balances` | View all employee balances | **HR / ADMIN** |
| `POST` | `/api/leaves` | Apply for leave (validates balance & overlapping dates) | Authenticated |
| `GET` | `/api/leaves/me` | Fetch personal leave application history | Authenticated |
| `GET` | `/api/leaves` | Organization leave requests for review | **HR / ADMIN** |
| `PATCH` | `/api/leaves/{id}/approve` | Approve leave & atomically deduct balance | **HR / ADMIN** |
| `PATCH` | `/api/leaves/{id}/reject` | Reject leave with review comment | **HR / ADMIN** |
| `PATCH` | `/api/leaves/{id}/cancel` | Cancel pending or approved leave (restores balance) | Authenticated |

### 5. Payroll & Payslips (`/api/payroll`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payroll/generate` | Generate payroll (`Net = Basic + Allowances + Bonus - Deductions`) | **HR / ADMIN** |
| `GET` | `/api/payroll/me` | Personal payroll history | Authenticated |
| `GET` | `/api/payroll` | Organization payroll register with month filter | **HR / ADMIN** |
| `GET` | `/api/payroll/summary` | Monthly payroll financial aggregates | **HR / ADMIN** |
| `GET` | `/api/payroll/{id}` | View specific payroll record | Authenticated (Ownership) |
| `PATCH` | `/api/payroll/{id}/status` | Update payment status (PAID / PENDING / PROCESSING) | **HR / ADMIN** |
| `GET` | `/api/payroll/{id}/payslip` | Download certified PDF payslip | Authenticated (Ownership) |

### 6. Notifications (`/api/notifications`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | List user notifications | Authenticated |
| `GET` | `/api/notifications/unread-count` | Real-time unread badge count | Authenticated |
| `PATCH` | `/api/notifications/{id}/read` | Mark individual notification as read | Authenticated |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read | Authenticated |

### 7. Real-Time Dashboards (`/api/dashboard`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/employee` | Aggregated shift, leave balance, recent leaves & payroll | **EMPLOYEE / HR / ADMIN** |
| `GET` | `/api/dashboard/hr` | Active headcount, today's attendance, pending leaves | **HR / ADMIN** |
| `GET` | `/api/dashboard/admin` | Total accounts, role distribution, system health | **ADMIN** |

### 8. Employee Onboarding System (`/api/onboarding`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/onboarding` | List onboarding tasks (scoped to self for employees) | Authenticated |
| `GET` | `/api/onboarding/summary` | Progress percentage and checklist breakdown | Authenticated |
| `POST` | `/api/onboarding` | Assign onboarding checklist task | **HR / ADMIN** |
| `PATCH` | `/api/onboarding/{id}/status` | Toggle task completion status | Authenticated (Ownership) |
| `PUT` | `/api/onboarding/{id}` | Edit task name and target due date | **HR / ADMIN** |
| `DELETE` | `/api/onboarding/{id}` | Remove onboarding task | **HR / ADMIN** |

### 9. Resignation & Exit Management (`/api/resignations`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/resignations` | List resignation requests (scoped to self for employees) | Authenticated |
| `GET` | `/api/resignations/{id}` | View resignation request detail | Authenticated (Ownership) |
| `POST` | `/api/resignations` | Submit formal resignation request | Authenticated (Employee) |
| `PATCH` | `/api/resignations/{id}/review` | Approve or reject resignation with remarks | **HR / ADMIN** |

### 10. Internal Announcements System (`/api/announcements`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Bulletin feed with priority badges and search | Authenticated |
| `GET` | `/api/announcements/{id}` | View announcement detail | Authenticated |
| `POST` | `/api/announcements` | Publish company announcement (broadcasts if Urgent/High) | **HR / ADMIN** |
| `PUT` | `/api/announcements/{id}` | Edit announcement title, priority, or message | **HR / ADMIN** |
| `DELETE` | `/api/announcements/{id}` | Remove announcement from bulletin | **HR / ADMIN** |

### 11. Internal Task Assignment & Tracking (`/api/tasks`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | List assigned tasks with search and priority filter | Authenticated (Ownership) |
| `GET` | `/api/tasks/metrics` | Counts of Total, Pending, In-Progress, Completed, Overdue | Authenticated |
| `GET` | `/api/tasks/{id}` | View task details | Authenticated (Ownership) |
| `POST` | `/api/tasks` | Create and assign task to employee | **HR / ADMIN** |
| `PATCH` | `/api/tasks/{id}/status` | Update task status (Pending, In Progress, Completed) | Authenticated (Ownership) |
| `PUT` | `/api/tasks/{id}` | Edit task details, priority, or due date | **HR / ADMIN** |
| `DELETE` | `/api/tasks/{id}` | Delete task | **HR / ADMIN** |

### 12. Third-Party Integrations & Exports (`/api/calendar` & `/api/exports`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/calendar/export.ics` | RFC 5545 iCalendar stream of shifts and leaves | Authenticated |
| `GET` | `/api/calendar/google/status` | Google Calendar OAuth integration status | Authenticated |
| `GET` | `/api/exports/attendance.csv` | Sanitized CSV export of daily attendance | Authenticated (Ownership) |
| `GET` | `/api/exports/payroll.csv` | Sanitized CSV export of salary computations | Authenticated (Ownership) |
| `GET` | `/api/exports/leaves.csv` | Sanitized CSV export of leave requests | Authenticated (Ownership) |

### 13. Employee Feedback System (`/api/feedback`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/feedback` | Submit 1–5 star rating and feedback (with Anonymous option) | Authenticated |
| `GET` | `/api/feedback` | List feedback (anonymity preserved for HR/Admin) | Authenticated |
| `GET` | `/api/feedback/metrics` | Average sentiment rating and category breakdown | **HR / ADMIN** |
| `PATCH` | `/api/feedback/{id}/status` | Acknowledge feedback and submit HR response | **HR / ADMIN** |

### 14. Profile & Settings Management (`/api/profile`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/profile` | Comprehensive profile, employee info, and settings | Authenticated |
| `PUT` | `/api/profile` | Self-service update of phone, address, emergency contact | Authenticated |
| `POST` | `/api/profile/change-password` | Argon2 password change verifying current password | Authenticated |
| `GET` | `/api/profile/settings` | Notification preferences and interface theme | Authenticated |
| `PUT` | `/api/profile/settings` | Update email/in-app notification toggles and theme | Authenticated |

---

## 🛡️ Key Architectural & Security Guarantees
- **Live DB Authentication & RBAC**: Every request verifies current account active status and role directly in MySQL, preventing stale JWT bypass when an account is demoted or deactivated.
- **Resource Ownership Verification**: Employees are strictly restricted to their own attendance, leaves, and payroll records (`verify_employee_ownership`).
- **Atomic Balance Deductions**: Leave approval uses MySQL row-level locking (`with_for_update`) to prevent race conditions and negative balances under concurrent approvals.
- **Last Active Admin Protection**: The system prevents the last active Administrator from being demoted, deactivated, or deleted.
- **Audit-Safe Soft Deletion**: When deleting a user with financial or attendance history, the system automatically transitions the user to deactivated state to preserve audit integrity.
- **CSV Formula Injection Defense**: All tabular export endpoints sanitize user input starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prefixing with a single quote to prevent DDE code execution in spreadsheet software.
- **Resignation Non-Deactivation Policy**: Approving a resignation updates the exit workflow status and records handover remarks, but never deletes or prematurely deactivates the employee account.
- **Anonymous Feedback Protection**: Submissions flagged as anonymous automatically redact employee identification and department details in HR/Admin queries.
- **Secure Password Lifecycle**: Self-service password changes strictly verify the current Argon2 hash before applying the new password.
- **Graceful Third-Party Integrations**: SMTP email notifications and Google Calendar OAuth interfaces handle offline/unconfigured environments gracefully without raising 500 errors or leaking credentials.
