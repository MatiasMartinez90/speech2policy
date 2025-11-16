from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Database settings
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "cloudacademy"
    db_user: str = "postgres"
    db_password: str = ""
    
    # CORS settings
    cors_origins: List[str] = [
        "https://cloudacademy.ar",
        "https://www.cloudacademy.ar",
        "https://proyectos.cloudacademy.ar",
        "https://www.proyectos.cloudacademy.ar",
        "http://localhost:3000",
        "http://localhost:3001"
    ]
    
    # Service settings
    service_name: str = "cloudacademy-web-apis"
    log_level: str = "INFO"

    # Webhook settings
    webhook_api_key: str = ""  # Set via WEBHOOK_API_KEY env var
    
    @property
    def database_url(self) -> str:
        """Get database connection URL"""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()