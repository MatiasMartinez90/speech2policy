import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # FastAPI settings
    app_name: str = "Bedrock Chat API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # CORS settings
    cors_origins: List[str] = [
        "https://proyectos.cloudacademy.ar",
        "http://localhost:3000"
    ]
    
    # AWS Cognito settings
    cognito_region: str = "us-east-1"
    cognito_user_pool_id: str = "us-east-1_kbBZ0w9sf"
    cognito_client_id: str = "7ho22jco9j63c3hmsrsp4bj0ti"
    cognito_issuer: str = f"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_kbBZ0w9sf"
    
    # AWS Bedrock settings
    bedrock_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    
    # AWS Credentials (preferiblemente desde IAM roles en K8s)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    
    # Course configuration
    supported_courses: List[str] = [
        "bedrock-rag",
        "seguridad", 
        "networks",
        "databases",
        "devops"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()