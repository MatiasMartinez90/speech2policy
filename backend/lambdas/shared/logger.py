"""
Structured logging utility using AWS Lambda Powertools
"""

import os
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths

# Get log level from environment (default: INFO)
log_level = os.environ.get("LOG_LEVEL", "INFO")

# Create logger instance
logger = Logger(
    service="speech2policy",
    level=log_level,
    correlation_id_path=correlation_paths.API_GATEWAY_REST
)

def get_logger(service_name: str = None):
    """
    Get a logger instance with optional service name

    Args:
        service_name: Optional service name to override default

    Returns:
        Logger instance
    """
    if service_name:
        return Logger(
            service=service_name,
            level=log_level,
            correlation_id_path=correlation_paths.API_GATEWAY_REST
        )
    return logger


__all__ = ["logger", "get_logger"]
