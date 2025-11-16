from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import logging
from datetime import datetime

from app.models.webhook_models import CognitoWebhookRequest, CognitoWebhookResponse
from app.database.connection import db
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

async def verify_api_key(x_api_key: str = Header(...)):
    """Verify API Key from header"""
    if x_api_key != settings.webhook_api_key:
        logger.warning(f"⚠️ Invalid API key attempt")
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

@router.post("/cognito-register", 
            response_model=CognitoWebhookResponse,
            dependencies=[Depends(verify_api_key)])
async def cognito_post_confirmation(request: CognitoWebhookRequest):
    """
    Webhook endpoint for Cognito post-confirmation trigger
    
    Called by Lambda when a user confirms their registration (email or Google OAuth)
    Requires X-API-Key header for authentication
    """
    try:
        logger.info(f"📥 Webhook received for user: {request.email}")
        
        # Insert or update user in database
        insert_query = """
        INSERT INTO users (cognito_user_id, email, name, picture_url, provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (cognito_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            picture_url = EXCLUDED.picture_url,
            provider = EXCLUDED.provider,
            updated_at = EXCLUDED.updated_at
        RETURNING id;
        """
        
        now = datetime.utcnow()
        result = await db.execute_query(
            insert_query,
            request.cognito_user_id,
            request.email,
            request.name,
            request.picture_url,
            request.provider,
            now,
            now
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        user_id = result[0]['id']
        logger.info(f"✅ User registered in database: {request.email} (ID: {user_id})")
        
        return CognitoWebhookResponse(
            success=True,
            user_id=str(user_id),
            message=f"User {request.email} registered successfully"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to register user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register user: {str(e)}"
        )

@router.get("/health")
async def webhooks_health():
    """Health check for webhooks API"""
    return {"status": "healthy", "service": "webhooks-api"}
