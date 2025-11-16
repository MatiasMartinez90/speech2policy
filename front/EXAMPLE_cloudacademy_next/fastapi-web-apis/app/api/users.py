from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.models.user_models import UserProgressResponse, ErrorResponse
from app.database.connection import get_user_progress_data

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/me/progress", 
           response_model=UserProgressResponse,
           responses={
               404: {"model": ErrorResponse, "description": "User not found"},
               500: {"model": ErrorResponse, "description": "Internal server error"}
           })
async def get_user_progress(
    user_id: str = Query(..., description="User ID to get progress for")
):
    """
    Get user course progress and statistics
    
    Returns comprehensive information about a user's course enrollment,
    progress percentages, completion status, and overall statistics.
    """
    try:
        logger.info(f"📊 Getting progress for user: {user_id}")
        
        # Get user progress data from database
        progress_data = await get_user_progress_data(user_id)
        
        logger.info(f"✅ Successfully retrieved progress for user: {user_id}")
        
        return progress_data
        
    except ValueError as e:
        # User not found
        logger.warning(f"⚠️ User not found: {user_id}")
        raise HTTPException(
            status_code=404, 
            detail=f"User not found: {user_id}"
        )
        
    except Exception as e:
        # Database or other errors
        logger.error(f"❌ Failed to get user progress: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user progress"
        )

@router.get("/health")
async def users_health():
    """Health check for users API"""
    return {"status": "healthy", "service": "users-api"}