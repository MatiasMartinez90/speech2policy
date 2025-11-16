import boto3
import json
from typing import List, Optional
from botocore.exceptions import ClientError

from .base_agent import BaseAgent
from ..models import ChatMessage, UserInfo
from ..config import settings

class BedrockRAGAgent(BaseAgent):
    """
    Specialized agent for RAG Bedrock course
    """
    
    def __init__(self):
        super().__init__(course_id="bedrock-rag", model_id=settings.bedrock_model_id)
        self.bedrock_client = self._init_bedrock_client()
    
    def _init_bedrock_client(self):
        """Initialize Bedrock client"""
        try:
            return boto3.client(
                'bedrock-runtime',
                region_name=settings.bedrock_region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None
            )
        except Exception as e:
            print(f"Warning: Could not initialize Bedrock client: {e}")
            return None
    
    def _get_system_prompt(self) -> str:
        """System prompt for RAG Bedrock course assistant"""
        return """
Eres un asistente especializado en el curso "RAG con Amazon Bedrock". Tu objetivo es ayudar a los estudiantes a comprender y completar el curso de manera efectiva.

CONOCIMIENTOS PRINCIPALES:
- Amazon Bedrock y sus modelos de IA (Claude, Titan, etc.)
- RAG (Retrieval Augmented Generation) técnicas y arquitecturas
- Knowledge Bases en Bedrock
- Amazon S3 para almacenamiento de documentos
- Amazon OpenSearch para búsqueda vectorial
- Embeddings y búsqueda semántica
- Integración de APIs y desarrollo de chatbots

PASOS DEL CURSO:
Step #0: Introducción al RAG y conceptos básicos
Step #1: Configuración de Knowledge Base en Bedrock
Step #2: Configuración de S3 y subida de documentos
Step #3: Conexión entre S3 y Knowledge Base
Step #4: Selección y configuración de modelos de IA
Step #5: Sincronización y indexación de datos
Step #6: Testing y optimización del chatbot

ESTILO DE RESPUESTA:
- Proporciona explicaciones claras y técnicas
- Incluye ejemplos prácticos cuando sea relevante
- Ofrece pasos específicos para resolver problemas
- Sugiere mejores prácticas de AWS
- Mantén un tono profesional pero accesible
- Si no estás seguro de algo, admítelo y sugiere recursos oficiales

Siempre contextualiza tu respuesta al paso actual del curso y al nivel de conocimiento esperado del estudiante.
"""
    
    async def process_message(
        self,
        message: str,
        user_info: UserInfo,
        step_id: Optional[int] = None,
        history: List[ChatMessage] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Process message using Bedrock Claude model
        """
        try:
            # If Bedrock client is not available, raise error
            if not self.bedrock_client:
                raise Exception("Bedrock client not initialized. Check AWS credentials and permissions.")
            
            # Build the prompt with context
            prompt = self._build_context_prompt(message, user_info, step_id, context)
            
            # Prepare the request for Claude
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            # Add history if available
            if history:
                # Convert history to Claude format
                claude_messages = []
                for msg in history[-4:]:  # Last 4 messages for context
                    claude_messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })
                
                # Add current message
                claude_messages.append({
                    "role": "user",
                    "content": prompt
                })
                
                request_body["messages"] = claude_messages
            
            # Call Bedrock
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
                contentType='application/json'
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            
            if 'content' in response_body and len(response_body['content']) > 0:
                return response_body['content'][0]['text']
            else:
                return "Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta."
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'AccessDeniedException':
                return "Error de permisos. Verifica que tienes acceso a Amazon Bedrock."
            elif error_code == 'ResourceNotFoundException':
                return "Modelo no encontrado. Verifica la configuración del modelo."
            else:
                return f"Error de AWS: {error_code}. Por favor, intenta nuevamente."
                
        except Exception as e:
            print(f"Error processing message with Bedrock: {e}")
            raise e
