"""
History Handler Lambda - Manages policy history and retrieval
"""

import json
from typing import Dict

import sys
sys.path.append("/opt/python")
sys.path.append("../shared")

from shared.logger import logger
from shared.auth_utils import get_user_id, is_authenticated
from shared.response_utils import (
    success_response,
    error_response,
    unauthorized_response
)
from shared.dynamodb_utils import get_user_policies


@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    Handle policy history requests

    Supported paths:
    - GET /api/policies/history - Get user's policy history
    """
    try:
        logger.info("History handler invoked", extra={"event": event})

        # Check authentication
        if not is_authenticated(event):
            return unauthorized_response("Authentication required")

        user_id = get_user_id(event)

        # Get query parameters
        query_params = event.get("queryStringParameters") or {}
        limit = int(query_params.get("limit", 20))
        limit = min(limit, 100)  # Max 100

        # Get user's policies
        policies = get_user_policies(user_id, limit=limit)

        # Parse policyJson strings back to objects
        for policy in policies:
            if "policyJson" in policy and isinstance(policy["policyJson"], str):
                try:
                    policy["policyJson"] = json.loads(policy["policyJson"])
                except:
                    pass  # Keep as string if parsing fails

        return success_response({
            "policies": policies,
            "count": len(policies)
        })

    except Exception as e:
        logger.error("Error in history handler", exc_info=e)
        return error_response("Internal server error", status_code=500)
