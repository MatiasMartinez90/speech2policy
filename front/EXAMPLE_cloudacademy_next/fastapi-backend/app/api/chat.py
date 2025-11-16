from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import get_current_user
from ..models import ChatRequest, ChatResponse, ErrorResponse, UserInfo
from ..agents import get_agent
from ..config import settings

router = APIRouter(prefix="/api/bedrock", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Main chat endpoint for course-specific AI assistance
    """
    try:
        # Validate course ID
        if request.courseId not in settings.supported_courses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course '{request.courseId}' is not supported. Supported courses: {settings.supported_courses}"
            )
        
        # Get the appropriate agent for the course
        try:
            agent = get_agent(request.courseId)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Process the message with the agent
        response_message = await agent.process_message(
            message=request.message,
            user_info=current_user,
            step_id=request.stepId,
            history=request.history,
            context=request.context
        )
        
        return ChatResponse(
            success=True,
            message=response_message,
            timestamp=datetime.utcnow(),
            user_id=current_user.user_id,
            course_id=request.courseId,
            step_id=request.stepId
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error in production
        print(f"Unexpected error in chat endpoint: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request"
        )

@router.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "service": "bedrock-chat-api",
        "version": settings.app_version
    }

@router.get("/courses")
async def get_supported_courses():
    """
    Get list of supported courses
    """
    return {
        "courses": settings.supported_courses,
        "total": len(settings.supported_courses)
    }

@router.get("/courses/{course_id}/info")
async def get_course_info(course_id: str):
    """
    Get information about a specific course
    """
    if course_id not in settings.supported_courses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found"
        )
    
    # Course metadata - this could be moved to a database later
    course_info = {
        "bedrock-rag": {
            "name": "RAG con Amazon Bedrock",
            "description": "Aprende a construir chatbots inteligentes con RAG y Amazon Bedrock",
            "steps": 7,
            "duration": "4-6 horas",
            "difficulty": "Intermedio"
        }
        # Add other courses here
    }
    
    return course_info.get(course_id, {"name": course_id, "description": "Curso disponible"})

# Error handlers moved to main.py