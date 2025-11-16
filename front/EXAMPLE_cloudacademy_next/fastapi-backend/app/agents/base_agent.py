from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ..models import ChatMessage, UserInfo

class BaseAgent(ABC):
    """
    Base class for all course agents
    """
    
    def __init__(self, course_id: str, model_id: str):
        self.course_id = course_id
        self.model_id = model_id
        self.system_prompt = self._get_system_prompt()
    
    @abstractmethod
    def _get_system_prompt(self) -> str:
        """
        Get the system prompt for this agent
        Should be implemented by each course-specific agent
        """
        pass
    
    @abstractmethod
    async def process_message(
        self,
        message: str,
        user_info: UserInfo,
        step_id: Optional[int] = None,
        history: List[ChatMessage] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Process a user message and return AI response
        Should be implemented by each course-specific agent
        """
        pass
    
    def _build_context_prompt(
        self,
        message: str,
        user_info: UserInfo,
        step_id: Optional[int] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Build context-aware prompt for the AI model
        """
        context_parts = [
            f"Usuario: {user_info.name} ({user_info.email})",
            f"Curso: {self.course_id}",
        ]
        
        if step_id is not None:
            context_parts.append(f"Step actual: #{step_id}")
        
        if context:
            context_parts.append(f"Contexto adicional: {context}")
        
        context_string = " | ".join(context_parts)
        
        return f"""
{self.system_prompt}

CONTEXTO ACTUAL: {context_string}

PREGUNTA DEL USUARIO: {message}

Por favor, proporciona una respuesta útil, específica y educativa basada en el contexto del curso y el paso actual.
"""
    
    def _format_history_for_context(self, history: List[ChatMessage]) -> str:
        """
        Format chat history for context
        """
        if not history:
            return ""
        
        formatted_history = []
        for msg in history[-5:]:  # Last 5 messages only
            role = "Usuario" if msg.role == "user" else "Asistente"
            formatted_history.append(f"{role}: {msg.content}")
        
        return "\n".join(formatted_history)
    
    def _validate_course_relevance(self, message: str) -> bool:
        """
        Basic validation to ensure message is course-relevant
        Can be overridden by specific agents
        """
        # Basic implementation - can be enhanced
        return len(message.strip()) > 0