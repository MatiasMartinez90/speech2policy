from .base_agent import BaseAgent
from .bedrock_agent import BedrockRAGAgent

# Agent registry for easy access
AGENTS = {
    "bedrock-rag": BedrockRAGAgent,
    # Future agents will be added here
    # "seguridad": SecurityAgent,
    # "networks": NetworksAgent,
    # "databases": DatabasesAgent,
    # "devops": DevOpsAgent,
}

def get_agent(course_id: str) -> BaseAgent:
    """
    Factory function to get the appropriate agent for a course
    """
    agent_class = AGENTS.get(course_id)
    if not agent_class:
        raise ValueError(f"No agent found for course: {course_id}")
    
    return agent_class()

__all__ = ["BaseAgent", "BedrockRAGAgent", "AGENTS", "get_agent"]