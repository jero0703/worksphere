from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.user import UserResponse
from app.services.auth_service import register_user, authenticate_user, generate_user_token
from app.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new employee account",
    description="Registers a new user with EMPLOYEE role, creates corresponding employee profile, and returns an access token.",
)
def register(
    req: RegisterRequest,
    db: Session = Depends(get_db),
):
    user = register_user(db, req)
    return generate_user_token(user)


@router.post(
    "/login",
    response_model=Token,
    summary="Login to obtain JWT token",
    description="Authenticates email and password. Returns a signed JWT token along with user profile and role details.",
)
def login(
    req: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, req.email, req.password)
    return generate_user_token(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile and employee information of the currently authenticated user.",
)
def get_me(
    current_user: User = Depends(get_current_active_user),
):
    return current_user


@router.post(
    "/logout",
    summary="User logout",
    description="Client clears JWT storage. Endpoint provides standard confirmation for audit trail.",
)
def logout(
    current_user: User = Depends(get_current_active_user),
):
    return {"message": "Successfully logged out", "username": current_user.username}
