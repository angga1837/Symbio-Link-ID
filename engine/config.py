from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database
    # Railway/production uses DATABASE_URL env var (injected by Railway)
    # Local dev defaults to localhost PostgreSQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://symbio:symbio_enterprise_2026@localhost:5433/symbio_enterprise"
    )

    # Auth
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480

    # Blockchain
    BLOCKCHAIN_URL: str = "http://localhost:4000"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # ML
    ML_PURITY_THRESHOLD: float = 0.60
    ML_PURITY_CEILING: float = 0.986

    # CO2 factor (kg CO2 saved per kg material diverted)
    CO2_FACTOR: float = 0.45

    # Mock data seeding
    SEED_MOCK_DATA: bool = False
    SEED_MOCK_FORCE: bool = False

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    # Normalize DATABASE_URL: many platforms inject a sync-style
    # URL like `postgres://...` or `postgresql://...`. Ensure we
    # use the asyncpg driver so SQLAlchemy doesn't try to import
    # `psycopg2` (which causes ModuleNotFoundError in the container).
    db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
    if db_url:
        # handle legacy/heroku style `postgres://` and bare `postgresql://`
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    settings.DATABASE_URL = db_url
    return settings
