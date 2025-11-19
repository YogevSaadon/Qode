"""
Configuration management for Qode backend.
Handles environment variables, CORS settings, and application constants.
"""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Qode"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./qode.db"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Rate Limiting (future use)
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )


# Global settings instance
settings = Settings()
