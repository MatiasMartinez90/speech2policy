"""
Cognito Post-Confirmation Lambda
Triggered after user confirms signup
"""

import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """
    Handle Cognito post-confirmation trigger

    Args:
        event: Cognito trigger event
        context: Lambda context

    Returns:
        The event (required by Cognito)
    """
    try:
        logger.info("Post-confirmation trigger invoked")
        logger.info(f"Event: {json.dumps(event)}")

        # Extract user attributes
        user_attributes = event.get("request", {}).get("userAttributes", {})

        user_id = user_attributes.get("sub")
        email = user_attributes.get("email")
        name = user_attributes.get("name", "")

        logger.info(f"User confirmed: {email} (ID: {user_id})")

        # The user-handler Lambda in the backend will create the DynamoDB record
        # This Lambda just logs the confirmation

        # IMPORTANT: Must return the event
        return event

    except Exception as e:
        logger.error(f"Error in post-confirmation handler: {str(e)}", exc_info=True)
        # Still return event to not block user signup
        return event
