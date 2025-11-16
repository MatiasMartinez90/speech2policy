from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CognitoWebhookRequest(BaseModel):
    """Request model for Cognito post-confirmation webhook"""
    cognito_user_id: str
    email: EmailStr
    name: Optional[str] = None
    picture_url: Optional[str] = None
    provider: str = "email"  # "email" or "google"
    
class CognitoWebhookResponse(BaseModel):
    """Response model for webhook"""
    success: bool
    user_id: Optional[str] = None
    message: str
