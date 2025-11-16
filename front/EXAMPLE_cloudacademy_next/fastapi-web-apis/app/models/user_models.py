from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class UserInfo(BaseModel):
    """User basic information"""
    id: UUID
    name: str
    email: str
    
    class Config:
        # This allows Pydantic to serialize UUIDs as strings in JSON responses
        json_encoders = {
            UUID: str
        }

class UserStatistics(BaseModel):
    """User course statistics"""
    total_courses_enrolled: int
    courses_completed: int
    average_progress: float = Field(ge=0, le=100)

class CourseProgress(BaseModel):
    """Individual course progress"""
    course_id: str
    progress_percentage: int = Field(ge=0, le=100)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_accessed: Optional[datetime] = None

class UserProgressResponse(BaseModel):
    """Complete user progress response"""
    user: UserInfo
    statistics: UserStatistics
    courses: List[CourseProgress]

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str
    error_code: Optional[str] = None