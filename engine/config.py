from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://symbio:symbio_enterprise_2026@localhost:5433/symbio_enterprise"

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

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
