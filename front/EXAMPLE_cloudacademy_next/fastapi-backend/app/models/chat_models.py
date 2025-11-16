from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class ChatMessage(BaseModel):
    """Individual chat message model"""
    content: str
    role: str = Field(..., pattern="^(user|assistant)$")
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    """Chat request payload"""
    message: str = Field(..., min_length=1, max_length=2000)
    courseId: str = Field(..., alias="courseId")
    stepId: Optional[int] = Field(default=0, alias="stepId")
    context: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list, max_items=10)

class ChatResponse(BaseModel):
    """Chat response payload"""
    success: bool
    message: str
    timestamp: datetime
    user_id: Optional[str] = None
    course_id: Optional[str] = None
    step_id: Optional[int] = None

class ErrorResponse(BaseModel):
    """Error response payload"""
    success: bool = False
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class UserInfo(BaseModel):
    """User information from Cognito JWT"""
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    username: str