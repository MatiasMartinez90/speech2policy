"""
Validation utilities for IAM policies and user input
"""

import re
import json
from typing import Dict, List, Tuple, Optional
from .logger import logger


# ================================================================
# IAM Policy Validation
# ================================================================

def validate_iam_policy_structure(policy: Dict) -> Tuple[bool, Optional[str]]:
    """
    Validate basic IAM policy JSON structure

    Args:
        policy: Policy dict

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Check required fields
        if "Version" not in policy:
            return False, "Missing required field: Version"

        if "Statement" not in policy:
            return False, "Missing required field: Statement"

        # Validate Version
        if policy["Version"] not in ["2012-10-17", "2008-10-17"]:
            return False, f"Invalid Version: {policy['Version']} (must be 2012-10-17 or 2008-10-17)"

        # Validate Statement is a list
        if not isinstance(policy["Statement"], list):
            return False, "Statement must be an array"

        # Validate each statement
        for idx, statement in enumerate(policy["Statement"]):
            is_valid, error = validate_statement(statement)
            if not is_valid:
                return False, f"Statement[{idx}]: {error}"

        return True, None

    except Exception as e:
        logger.error("Error validating IAM policy structure", exc_info=e)
        return False, str(e)


def validate_statement(statement: Dict) -> Tuple[bool, Optional[str]]:
    """
    Validate a single IAM policy statement

    Args:
        statement: Statement dict

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check Effect
    if "Effect" not in statement:
        return False, "Missing required field: Effect"

    if statement["Effect"] not in ["Allow", "Deny"]:
        return False, f"Invalid Effect: {statement['Effect']} (must be Allow or Deny)"

    # Check Action or NotAction
    has_action = "Action" in statement or "NotAction" in statement
    if not has_action:
        return False, "Must have either Action or NotAction"

    # Check Resource or NotResource
    has_resource = "Resource" in statement or "NotResource" in statement
    if not has_resource:
        return False, "Must have either Resource or NotResource"

    return True, None


def validate_arn_format(arn: str) -> bool:
    """
    Validate ARN format

    Args:
        arn: ARN string

    Returns:
        True if valid format
    """
    # Allow wildcards
    if arn == "*":
        return True

    # ARN format: arn:partition:service:region:account-id:resource-type/resource-id
    arn_pattern = r"^arn:([a-z\-]+):([a-z0-9\-]+):([a-z0-9\-]*):(\d{12}|[\*]):(.+)$"
    return bool(re.match(arn_pattern, arn))


def validate_action_format(action: str) -> bool:
    """
    Validate IAM action format

    Args:
        action: Action string (e.g., "s3:GetObject")

    Returns:
        True if valid format
    """
    # Allow wildcards
    if action == "*":
        return True

    # Service:Action format with optional wildcards
    action_pattern = r"^[a-z0-9\-]+:[a-zA-Z0-9\*]+$"
    return bool(re.match(action_pattern, action))


# ================================================================
# Risk Analysis Helpers
# ================================================================

DANGEROUS_ACTIONS = [
    "iam:CreateUser",
    "iam:CreateRole",
    "iam:AttachUserPolicy",
    "iam:AttachRolePolicy",
    "iam:PutUserPolicy",
    "iam:PutRolePolicy",
    "iam:CreateAccessKey",
    "iam:DeleteUser",
    "iam:DeleteRole",
    "sts:AssumeRole",
    "ec2:RunInstances",
    "lambda:CreateFunction",
    "lambda:UpdateFunctionCode",
    "s3:DeleteBucket",
    "dynamodb:DeleteTable",
    "rds:DeleteDBInstance"
]

ADMIN_WILDCARDS = [
    "*:*",
    "iam:*",
    "s3:*",
    "ec2:*",
    "dynamodb:*"
]


def detect_dangerous_permissions(policy: Dict) -> List[Dict]:
    """
    Detect dangerous permissions in policy

    Args:
        policy: IAM policy dict

    Returns:
        List of warnings
    """
    warnings = []

    try:
        statements = policy.get("Statement", [])

        for idx, statement in enumerate(statements):
            if statement.get("Effect") != "Allow":
                continue

            actions = statement.get("Action", [])
            if isinstance(actions, str):
                actions = [actions]

            resources = statement.get("Resource", [])
            if isinstance(resources, str):
                resources = [resources]

            # Check for wildcard resource
            if "*" in resources:
                warnings.append({
                    "type": "wildcard_resource",
                    "severity": "HIGH",
                    "statement": idx,
                    "message": "Statement allows actions on ALL resources (*)",
                    "recommendation": "Specify explicit resource ARNs"
                })

            # Check for dangerous actions
            for action in actions:
                if action in DANGEROUS_ACTIONS:
                    warnings.append({
                        "type": "dangerous_action",
                        "severity": "HIGH",
                        "statement": idx,
                        "action": action,
                        "message": f"Potentially dangerous action: {action}",
                        "recommendation": "Review if this permission is necessary"
                    })

            # Check for admin wildcards
            for action in actions:
                if action in ADMIN_WILDCARDS:
                    warnings.append({
                        "type": "admin_wildcard",
                        "severity": "CRITICAL",
                        "statement": idx,
                        "action": action,
                        "message": f"Administrative wildcard detected: {action}",
                        "recommendation": "Use specific actions instead of wildcards"
                    })

            # Check for missing conditions on sensitive actions
            if "Condition" not in statement:
                sensitive_actions = set(actions) & set(DANGEROUS_ACTIONS)
                if sensitive_actions:
                    warnings.append({
                        "type": "missing_conditions",
                        "severity": "MEDIUM",
                        "statement": idx,
                        "message": "Sensitive actions without conditions",
                        "recommendation": "Add conditions like MFA, SourceIP, or time-based restrictions"
                    })

    except Exception as e:
        logger.error("Error detecting dangerous permissions", exc_info=e)

    return warnings


def calculate_risk_score(policy: Dict) -> int:
    """
    Calculate risk score (0-100) for an IAM policy

    Args:
        policy: IAM policy dict

    Returns:
        Risk score (0 = safe, 100 = very risky)
    """
    score = 0
    warnings = detect_dangerous_permissions(policy)

    # Base score from warning severity
    for warning in warnings:
        severity = warning.get("severity")
        if severity == "CRITICAL":
            score += 30
        elif severity == "HIGH":
            score += 20
        elif severity == "MEDIUM":
            score += 10
        elif severity == "LOW":
            score += 5

    # Cap at 100
    return min(score, 100)


# ================================================================
# Input Validation
# ================================================================

def validate_chat_message(message: str) -> Tuple[bool, Optional[str]]:
    """
    Validate chat message input

    Args:
        message: User message

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not message or not message.strip():
        return False, "Message cannot be empty"

    if len(message) > 5000:
        return False, "Message too long (max 5000 characters)"

    return True, None


def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format

    Args:
        session_id: Session ID

    Returns:
        True if valid
    """
    # UUID format or similar
    pattern = r"^[a-zA-Z0-9\-_]{20,100}$"
    return bool(re.match(pattern, session_id))


__all__ = [
    "validate_iam_policy_structure",
    "validate_statement",
    "validate_arn_format",
    "validate_action_format",
    "detect_dangerous_permissions",
    "calculate_risk_score",
    "validate_chat_message",
    "validate_session_id"
]
