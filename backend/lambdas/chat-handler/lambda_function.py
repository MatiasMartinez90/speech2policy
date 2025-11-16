"""
Chat Handler Lambda - Main conversational interface for Speech2Policy

Handles:
- User messages
- Bedrock AI responses
- Policy generation
- Risk analysis
- Session management
"""

import json
import uuid
from datetime import datetime
from typing import Dict

# Import shared utilities
import sys
sys.path.append("/opt/python")  # Lambda layer path
sys.path.append("../shared")    # Local development path

from shared.logger import logger
from shared.auth_utils import get_user_id, is_authenticated
from shared.response_utils import (
    success_response,
    error_response,
    unauthorized_response,
    rate_limit_response,
    validation_error
)
from shared.dynamodb_utils import (
    create_chat_session,
    get_chat_session,
    update_chat_session,
    save_chat_message,
    get_chat_messages,
    save_policy,
    increment_user_usage,
    get_user_usage,
    get_user
)
from shared.validators import validate_chat_message

# Import utils from this lambda
from utils.policy_generator import generate_policy_from_text, PolicyGenerationError
from utils.risk_analyzer import analyze_policy_risk
from utils.iam_validator import validate_policy


@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    Main Lambda handler for chat endpoint

    Supported paths:
    - POST /api/chat/message        - Send message, get AI response
    - GET  /api/chat/sessions       - List user's sessions
    - GET  /api/chat/sessions/{id}  - Get specific session with messages
    - DELETE /api/chat/sessions/{id} - Delete session
    """
    try:
        logger.info("Chat handler invoked", extra={"event": event})

        # Extract HTTP method and path
        http_method = event.get("httpMethod", "")
        path = event.get("path", "")
        path_parameters = event.get("pathParameters") or {}

        # Check authentication
        if not is_authenticated(event):
            return unauthorized_response("Authentication required")

        user_id = get_user_id(event)
        logger.info(f"Authenticated user: {user_id}")

        # Route to appropriate handler
        if http_method == "POST" and path.endswith("/message"):
            return handle_chat_message(event, user_id)

        elif http_method == "GET" and path.endswith("/sessions") and not path_parameters:
            return handle_list_sessions(user_id)

        elif http_method == "GET" and path_parameters.get("id"):
            return handle_get_session(path_parameters["id"], user_id)

        elif http_method == "DELETE" and path_parameters.get("id"):
            return handle_delete_session(path_parameters["id"], user_id)

        else:
            return error_response("Route not found", status_code=404)

    except Exception as e:
        logger.error("Unhandled error in chat handler", exc_info=e)
        return error_response("Internal server error", status_code=500)


def handle_chat_message(event: Dict, user_id: str) -> Dict:
    """
    Handle incoming chat message and generate AI response

    Args:
        event: API Gateway event
        user_id: Authenticated user ID

    Returns:
        API Gateway response
    """
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        message = body.get("message", "").strip()
        session_id = body.get("sessionId")

        # Validate message
        is_valid, error = validate_chat_message(message)
        if not is_valid:
            return validation_error({"message": error})

        # Check rate limiting (5 messages per day for free users)
        usage = get_user_usage(user_id)
        request_count = usage.get("requestCount", 0)

        # TODO: Check user tier (free vs paid)
        # For now, enforce 5/day limit for all users
        if request_count >= 5:
            return rate_limit_response(retry_after=86400)  # 24 hours

        # Increment usage
        new_count = increment_user_usage(user_id)
        logger.info(f"User {user_id} usage: {new_count}/5")

        # Create or get session
        if not session_id:
            # New session
            session_id = f"session_{uuid.uuid4().hex}"
            session_data = {
                "sessionId": session_id,
                "userId": user_id,
                "title": message[:50] + ("..." if len(message) > 50 else ""),
                "lastMessage": message,
                "messageCount": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
            create_chat_session(session_data)
            logger.info(f"Created new session: {session_id}")
        else:
            # Existing session - verify ownership
            session = get_chat_session(session_id)
            if not session or session.get("userId") != user_id:
                return error_response("Session not found or access denied", status_code=404)

        # Save user message
        user_message_id = f"msg_{uuid.uuid4().hex}"
        save_chat_message({
            "sessionId": session_id,
            "messageId": user_message_id,
            "role": "user",
            "content": message
        })

        # Get conversation history for context
        history = get_chat_messages(session_id)

        # Generate AI response with Bedrock
        try:
            ai_response = generate_policy_from_text(
                user_message=message,
                conversation_history=history
            )

            # Save AI message
            ai_message_id = f"msg_{uuid.uuid4().hex}"
            ai_message_data = {
                "sessionId": session_id,
                "messageId": ai_message_id,
                "role": "assistant",
                "content": ai_response.get("text", ""),
            }

            # If policy was generated, analyze it
            if ai_response.get("policyJson"):
                policy_json = ai_response["policyJson"]

                # Validate policy
                validation_result = validate_policy(policy_json)

                # Analyze risk
                risk_analysis = analyze_policy_risk(policy_json)

                # Add to message
                ai_message_data["policyJson"] = policy_json
                ai_message_data["riskScore"] = risk_analysis["score"]
                ai_message_data["riskWarnings"] = risk_analysis["warnings"]
                ai_message_data["validationResult"] = validation_result

                # Save policy to Policies table
                policy_id = f"policy_{uuid.uuid4().hex}"
                save_policy({
                    "policyId": policy_id,
                    "userId": user_id,
                    "sessionId": session_id,
                    "policyJson": json.dumps(policy_json),
                    "riskScore": risk_analysis["score"],
                    "messageId": ai_message_id
                })

            save_chat_message(ai_message_data)

            # Update session metadata
            update_chat_session(session_id, {
                "lastMessage": message,
                "messageCount": len(history) + 2,  # +2 for user and AI messages
                "updatedAt": datetime.utcnow().isoformat()
            })

            # Return response
            return success_response({
                "sessionId": session_id,
                "userMessage": {
                    "id": user_message_id,
                    "content": message,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "aiMessage": {
                    "id": ai_message_id,
                    "content": ai_response.get("text", ""),
                    "policyJson": ai_response.get("policyJson"),
                    "riskAnalysis": risk_analysis if ai_response.get("policyJson") else None,
                    "validationResult": validation_result if ai_response.get("policyJson") else None,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "usage": {
                    "remaining": max(0, 5 - new_count)
                }
            })

        except PolicyGenerationError as e:
            logger.error("Policy generation error", exc_info=e)
            return error_response(
                "Failed to generate policy",
                status_code=500,
                details={"error": str(e)}
            )

    except json.JSONDecodeError:
        return validation_error({"body": "Invalid JSON"})
    except Exception as e:
        logger.error("Error handling chat message", exc_info=e)
        return error_response("Internal server error", status_code=500)


def handle_list_sessions(user_id: str) -> Dict:
    """
    List all chat sessions for a user

    Args:
        user_id: User ID

    Returns:
        API Gateway response
    """
    try:
        from shared.dynamodb_utils import get_user_chat_sessions

        sessions = get_user_chat_sessions(user_id, limit=50)

        return success_response({
            "sessions": sessions,
            "count": len(sessions)
        })

    except Exception as e:
        logger.error("Error listing sessions", exc_info=e)
        return error_response("Failed to list sessions", status_code=500)


def handle_get_session(session_id: str, user_id: str) -> Dict:
    """
    Get a specific session with all messages

    Args:
        session_id: Session ID
        user_id: User ID (for authorization)

    Returns:
        API Gateway response
    """
    try:
        # Get session
        session = get_chat_session(session_id)

        if not session:
            return error_response("Session not found", status_code=404)

        # Verify ownership
        if session.get("userId") != user_id:
            return error_response("Access denied", status_code=403)

        # Get messages
        messages = get_chat_messages(session_id)

        return success_response({
            "session": session,
            "messages": messages
        })

    except Exception as e:
        logger.error(f"Error getting session {session_id}", exc_info=e)
        return error_response("Failed to get session", status_code=500)


def handle_delete_session(session_id: str, user_id: str) -> Dict:
    """
    Delete a chat session

    Args:
        session_id: Session ID
        user_id: User ID (for authorization)

    Returns:
        API Gateway response
    """
    try:
        # Get session to verify ownership
        session = get_chat_session(session_id)

        if not session:
            return error_response("Session not found", status_code=404)

        if session.get("userId") != user_id:
            return error_response("Access denied", status_code=403)

        # Delete session (DynamoDB delete)
        from shared.dynamodb_utils import get_table, CHAT_SESSIONS_TABLE, CHAT_MESSAGES_TABLE

        # Delete session record
        sessions_table = get_table(CHAT_SESSIONS_TABLE)
        sessions_table.delete_item(Key={"sessionId": session_id})

        # Delete all messages (batch delete)
        messages_table = get_table(CHAT_MESSAGES_TABLE)
        messages = get_chat_messages(session_id)

        with messages_table.batch_writer() as batch:
            for msg in messages:
                batch.delete_item(Key={
                    "sessionId": session_id,
                    "messageId": msg["messageId"]
                })

        logger.info(f"Deleted session {session_id} and {len(messages)} messages")

        return success_response({
            "message": "Session deleted successfully",
            "deletedMessages": len(messages)
        })

    except Exception as e:
        logger.error(f"Error deleting session {session_id}", exc_info=e)
        return error_response("Failed to delete session", status_code=500)
