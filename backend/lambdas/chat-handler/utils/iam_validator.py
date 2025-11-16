"""
IAM Policy Validator - Validates IAM policy syntax and structure
"""

import sys
sys.path.append("/opt/python")
sys.path.append("../../shared")

from shared.logger import logger
from shared.validators import (
    validate_iam_policy_structure,
    validate_arn_format,
    validate_action_format
)


def validate_policy(policy: dict) -> dict:
    """
    Validate an IAM policy

    Args:
        policy: IAM policy dict

    Returns:
        Dict with:
            - valid: Boolean
            - errors: List of error messages
            - warnings: List of warning messages
    """
    try:
        logger.info("Validating IAM policy")

        errors = []
        warnings = []

        # Validate basic structure
        is_valid, error_msg = validate_iam_policy_structure(policy)
        if not is_valid:
            errors.append(error_msg)
            return {
                "valid": False,
                "errors": errors,
                "warnings": warnings
            }

        # Validate ARNs in resources
        statements = policy.get("Statement", [])
        for idx, statement in enumerate(statements):
            # Check Resources
            resources = statement.get("Resource", [])
            if isinstance(resources, str):
                resources = [resources]

            for resource in resources:
                if resource != "*" and not validate_arn_format(resource):
                    warnings.append(f"Statement[{idx}]: Invalid ARN format: {resource}")

            # Check Actions
            actions = statement.get("Action", [])
            if isinstance(actions, str):
                actions = [actions]

            for action in actions:
                if action != "*" and not validate_action_format(action):
                    warnings.append(f"Statement[{idx}]: Invalid action format: {action}")

            # Check for missing Sid (best practice)
            if "Sid" not in statement:
                warnings.append(f"Statement[{idx}]: Missing Sid (statement ID) - best practice to include")

        logger.info(f"Validation complete - Valid: {is_valid}, Errors: {len(errors)}, Warnings: {len(warnings)}")

        return {
            "valid": True,
            "errors": errors,
            "warnings": warnings
        }

    except Exception as e:
        logger.error("Error validating policy", exc_info=e)
        return {
            "valid": False,
            "errors": [f"Validation error: {str(e)}"],
            "warnings": []
        }


__all__ = ["validate_policy"]
