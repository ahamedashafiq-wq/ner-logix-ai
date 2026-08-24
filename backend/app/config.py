import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NER-LOGIX AI Backend"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./ner_logix.db"  # Defaults to SQLite for local zero-config, supports PostgreSQL+PostGIS in prod
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ner-logix-secret-key-production-sih26002")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # Real-time
    TELEMETRY_INTERVAL_SECONDS: float = 3.0
    
    # External APIs
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
