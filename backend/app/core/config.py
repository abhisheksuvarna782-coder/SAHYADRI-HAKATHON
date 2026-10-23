"""
RouteRecover AI - Application Configuration (pydantic v2 + pydantic-settings)
"""
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key"
    APP_NAME: str = "RouteRecover AI"
    APP_VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = "sqlite:///./routerecover.db"

    # AI Provider
    AI_PROVIDER: str = "none"  # openai | anthropic | none
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.APP_ENV.lower() == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be false when APP_ENV is production.")
            if not self.SECRET_KEY or self.SECRET_KEY == "dev-secret-key":
                raise ValueError("Set a unique SECRET_KEY when APP_ENV is production.")
            if self.DATABASE_URL.lower().startswith("sqlite"):
                raise ValueError("Production deployments require a persistent non-SQLite DATABASE_URL.")
        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
