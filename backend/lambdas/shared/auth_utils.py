"""
Authentication and authorization utilities for Cognito JWT tokens
"""

import json
import base64
from typing import Dict, Optional, Tuple
from .logger import logger


def extract_user_from_event(event: Dict) -> Optional[Dict]:
    """
    Extract user information from API Gateway event (Cognito authorizer)

    Args:
        event: API Gateway event

    Returns:
        Dict with user info or None if not authenticated
    """
    try:
        # Check if authorizer context exists
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})

        if not authorizer:
            logger.warning("No authorizer context found in event")
            return None

        # Extract claims from Cognito authorizer
        claims = authorizer.get("claims", {})

        if not claims:
            logger.warning("No claims found in authorizer context")
            return None

        user_info = {
            "userId": claims.get("sub"),
            "email": claims.get("email"),
            "name": claims.get("name"),
            "picture": claims.get("picture"),
            "email_verified": claims.get("email_verified") == "true",
            "cognito_username": claims.get("cognito:username")
        }

        logger.info("User extracted from event", extra={"user_id": user_info["userId"]})
        return user_info

    except Exception as e:
        logger.error("Error extracting user from event", exc_info=e)
        return None


def get_user_id(event: Dict) -> Optional[str]:
    """
    Get user ID from event (shorthand)

    Args:
        event: API Gateway event

    Returns:
        User ID (sub claim) or None
    """
    user_info = extract_user_from_event(event)
    return user_info["userId"] if user_info else None


def is_authenticated(event: Dict) -> bool:
    """
    Check if request is authenticated

    Args:
        event: API Gateway event

    Returns:
        True if authenticated, False otherwise
    """
    return get_user_id(event) is not None


def decode_jwt_payload(token: str) -> Optional[Dict]:
    """
    Decode JWT payload (without verification - use Cognito authorizer for that)

    Args:
        token: JWT token string

    Returns:
        Decoded payload or None if invalid
    """
    try:
        # Split token
        parts = token.split(".")
        if len(parts) != 3:
            return None

        # Decode payload (middle part)
        payload = parts[1]

        # Add padding if needed
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding

        # Decode base64
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)

    except Exception as e:
        logger.error("Error decoding JWT", exc_info=e)
        return None


def check_rate_limit(user_id: str, limit: int = 5) -> Tuple[bool, int]:
    """
    Check if user has exceeded rate limit (to be implemented with DynamoDB)

    Args:
        user_id: User ID to check
        limit: Maximum number of requests allowed

    Returns:
        Tuple of (is_allowed, remaining_requests)
    """
    # TODO: Implement actual rate limiting with DynamoDB UserUsage table
    # For now, always allow
    logger.info(f"Rate limit check for user {user_id} (limit: {limit})")
    return True, limit


__all__ = [
    "extract_user_from_event",
    "get_user_id",
    "is_authenticated",
    "decode_jwt_payload",
    "check_rate_limit"
]
