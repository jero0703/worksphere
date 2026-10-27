from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.user import UserResponse
from app.services.auth_service import register_user, authenticate_user, generate_user_token
from app.dependencies.auth import get_current_active_user, get_current_user_optional
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 Access Token (Used by Swagger UI 'Authorize' button)",
    description="Authenticates username (email) and password using standard OAuth2 form data. Enables the green 'Authorize' button in Swagger UI.",
)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    return generate_user_token(user)


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
    summary="Login to obtain JWT token (JSON payload)",
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
    description="Returns the profile and employee information of the currently authenticated user. Requires Bearer Token or Swagger Authorization.",
    responses={
        401: {"description": "Unauthorized - Missing or expired Bearer token. Please click 'Authorize' in Swagger."},
    },
)
def get_me(
    current_user: User = Depends(get_current_active_user),
):
    return current_user


@router.post(
    "/logout",
    summary="User logout",
    description="Client clears JWT storage. Endpoint confirms logout gracefully even if not currently authenticated.",
)
def logout(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    username = current_user.username if current_user else "anonymous"
    return {
        "message": "Successfully logged out",
        "username": username,
    }
