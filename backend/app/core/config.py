import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "WorkSphere – HR Management System"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "worksphere_db"

    # JWT Authentication
    JWT_SECRET_KEY: str = "super_secret_temporary_key_for_dev_mode_worksphere_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Workday rules
    WORK_DAY_HOURS: float = 8.0
    HALF_DAY_HOURS: float = 4.0
    WORK_START_TIME: str = "09:00"
    LATE_GRACE_MINUTES: int = 15
    AUTO_ABSENT_CUTOFF_HOUR: int = 18

    # SMTP & Email Settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "noreply@worksphere.local"
    EMAILS_FROM_NAME: str = "WorkSphere HRMS"

    # Third-party integration configurations
    GOOGLE_CALENDAR_CLIENT_ID: Optional[str] = None
    GOOGLE_CALENDAR_CLIENT_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_database_url(self) -> str:
        """
        Returns properly formatted and escaped database URL.
        Escapes special characters in password if building from DB components.
        """
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            return self.DATABASE_URL.strip()
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+pymysql://{self.DB_USER}:{encoded_password}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
