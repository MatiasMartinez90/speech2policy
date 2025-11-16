"""
User Handler Lambda - User management and profile

This is typically triggered by Cognito post-confirmation
or can be called for user profile management
"""

import json
from datetime import datetime
from typing import Dict

import sys
sys.path.append("/opt/python")
sys.path.append("../shared")

from shared.logger import logger
from shared.dynamodb_utils import create_user, get_user
from shared.response_utils import success_response, error_response


@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    Handle user operations

    Can be triggered by:
    1. Cognito post-confirmation trigger
    2. API Gateway (GET /api/user/profile)
    """
    try:
        logger.info("User handler invoked", extra={"event": event})

        # Check if this is a Cognito trigger
        trigger_source = event.get("triggerSource")

        if trigger_source == "PostConfirmation_ConfirmSignUp":
            return handle_cognito_post_confirmation(event, context)

        # Otherwise, it's an API Gateway request
        http_method = event.get("httpMethod", "")

        if http_method == "GET":
            return handle_get_profile(event)

        return error_response("Method not allowed", status_code=405)

    except Exception as e:
        logger.error("Error in user handler", exc_info=e)

        # For Cognito triggers, must return the event
        if event.get("triggerSource"):
            return event

        return error_response("Internal server error", status_code=500)


def handle_cognito_post_confirmation(event: Dict, context) -> Dict:
    """
    Handle Cognito post-confirmation trigger

    Creates user record in DynamoDB when a new user confirms signup

    Args:
        event: Cognito trigger event
        context: Lambda context

    Returns:
        The event (required by Cognito)
    """
    try:
        logger.info("Processing Cognito post-confirmation")

        # Extract user attributes
        user_attributes = event.get("request", {}).get("userAttributes", {})

        user_id = user_attributes.get("sub")
        email = user_attributes.get("email")
        name = user_attributes.get("name", "")
        picture = user_attributes.get("picture", "")

        if not user_id or not email:
            logger.error("Missing required user attributes")
            return event

        # Create user record in DynamoDB
        user_data = {
            "userId": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "tier": "free",  # Default tier
            "createdAt": datetime.utcnow().isoformat(),
            "emailVerified": user_attributes.get("email_verified") == "true"
        }

        success = create_user(user_data)

        if success:
            logger.info(f"User created successfully: {user_id}")
        else:
            logger.error(f"Failed to create user: {user_id}")

        # IMPORTANT: Must return the event for Cognito
        return event

    except Exception as e:
        logger.error("Error in post-confirmation handler", exc_info=e)
        # Still return event to not block user signup
        return event


def handle_get_profile(event: Dict) -> Dict:
    """
    Handle GET /api/user/profile

    Args:
        event: API Gateway event

    Returns:
        API Gateway response
    """
    try:
        from shared.auth_utils import get_user_id, is_authenticated
        from shared.response_utils import unauthorized_response

        if not is_authenticated(event):
            return unauthorized_response("Authentication required")

        user_id = get_user_id(event)

        # Get user from DynamoDB
        user = get_user(user_id)

        if not user:
            return error_response("User not found", status_code=404)

        # Remove sensitive fields if any
        # (currently all fields are safe to return)

        return success_response({"user": user})

    except Exception as e:
        logger.error("Error getting user profile", exc_info=e)
        return error_response("Failed to get profile", status_code=500)
