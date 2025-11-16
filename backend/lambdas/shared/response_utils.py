"""
HTTP response utilities for API Gateway Lambda functions
"""

import json
from typing import Dict, Any, Optional
from .logger import logger


def cors_headers(additional_headers: Optional[Dict] = None) -> Dict[str, str]:
    """
    Get CORS headers for API responses

    Args:
        additional_headers: Optional additional headers to include

    Returns:
        Dict of headers
    """
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  # TODO: Restrict in production
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Max-Age": "86400"
    }

    if additional_headers:
        headers.update(additional_headers)

    return headers


def success_response(
    data: Any,
    status_code: int = 200,
    message: Optional[str] = None
) -> Dict:
    """
    Create a successful API Gateway response

    Args:
        data: Response data (will be JSON serialized)
        status_code: HTTP status code (default: 200)
        message: Optional success message

    Returns:
        API Gateway response dict
    """
    body = {
        "success": True,
        "data": data
    }

    if message:
        body["message"] = message

    return {
        "statusCode": status_code,
        "headers": cors_headers(),
        "body": json.dumps(body, default=str)
    }


def error_response(
    error: str,
    status_code: int = 400,
    details: Optional[Dict] = None
) -> Dict:
    """
    Create an error API Gateway response

    Args:
        error: Error message
        status_code: HTTP status code (default: 400)
        details: Optional error details

    Returns:
        API Gateway response dict
    """
    body = {
        "success": False,
        "error": error
    }

    if details:
        body["details"] = details

    logger.error(f"Error response: {error}", extra={"status_code": status_code, "details": details})

    return {
        "statusCode": status_code,
        "headers": cors_headers(),
        "body": json.dumps(body, default=str)
    }


def validation_error(errors: Dict[str, str]) -> Dict:
    """
    Create a validation error response (400)

    Args:
        errors: Dict of field_name: error_message

    Returns:
        API Gateway response dict
    """
    return error_response(
        error="Validation failed",
        status_code=400,
        details={"validation_errors": errors}
    )


def unauthorized_response(message: str = "Unauthorized") -> Dict:
    """
    Create an unauthorized response (401)

    Args:
        message: Error message

    Returns:
        API Gateway response dict
    """
    return error_response(error=message, status_code=401)


def forbidden_response(message: str = "Forbidden") -> Dict:
    """
    Create a forbidden response (403)

    Args:
        message: Error message

    Returns:
        API Gateway response dict
    """
    return error_response(error=message, status_code=403)


def not_found_response(resource: str = "Resource") -> Dict:
    """
    Create a not found response (404)

    Args:
        resource: Name of the resource that wasn't found

    Returns:
        API Gateway response dict
    """
    return error_response(error=f"{resource} not found", status_code=404)


def rate_limit_response(retry_after: int = 3600) -> Dict:
    """
    Create a rate limit exceeded response (429)

    Args:
        retry_after: Seconds until retry is allowed

    Returns:
        API Gateway response dict
    """
    headers = cors_headers({"Retry-After": str(retry_after)})

    return {
        "statusCode": 429,
        "headers": headers,
        "body": json.dumps({
            "success": False,
            "error": "Rate limit exceeded",
            "details": {
                "retry_after": retry_after,
                "message": f"Please try again in {retry_after} seconds"
            }
        })
    }


def server_error_response(message: str = "Internal server error") -> Dict:
    """
    Create an internal server error response (500)

    Args:
        message: Error message

    Returns:
        API Gateway response dict
    """
    return error_response(error=message, status_code=500)


__all__ = [
    "cors_headers",
    "success_response",
    "error_response",
    "validation_error",
    "unauthorized_response",
    "forbidden_response",
    "not_found_response",
    "rate_limit_response",
    "server_error_response"
]
