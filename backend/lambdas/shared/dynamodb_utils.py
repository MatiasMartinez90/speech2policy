"""
DynamoDB utility functions with optimized boto3 client
"""

import os
import boto3
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from .logger import logger

# Get table names from environment
USERS_TABLE = os.environ.get("USERS_TABLE", "Speech2Policy-Users")
CHAT_SESSIONS_TABLE = os.environ.get("CHAT_SESSIONS_TABLE", "Speech2Policy-ChatSessions")
CHAT_MESSAGES_TABLE = os.environ.get("CHAT_MESSAGES_TABLE", "Speech2Policy-ChatMessages")
POLICIES_TABLE = os.environ.get("POLICIES_TABLE", "Speech2Policy-Policies")
USER_USAGE_TABLE = os.environ.get("USER_USAGE_TABLE", "Speech2Policy-UserUsage")

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")


def get_table(table_name: str):
    """Get DynamoDB table resource"""
    return dynamodb.Table(table_name)


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj


def get_ttl_timestamp(days: int) -> int:
    """
    Get Unix timestamp for TTL (days from now)

    Args:
        days: Number of days until expiration

    Returns:
        Unix timestamp
    """
    expiration = datetime.utcnow() + timedelta(days=days)
    return int(expiration.timestamp())


# ================================================================
# User Operations
# ================================================================

def get_user(user_id: str) -> Optional[Dict]:
    """Get user by ID"""
    try:
        table = get_table(USERS_TABLE)
        response = table.get_item(Key={"userId": user_id})
        return decimal_to_float(response.get("Item"))
    except Exception as e:
        logger.error(f"Error getting user {user_id}", exc_info=e)
        return None


def create_user(user_data: Dict) -> bool:
    """Create a new user"""
    try:
        table = get_table(USERS_TABLE)
        user_data["createdAt"] = datetime.utcnow().isoformat()
        table.put_item(Item=user_data)
        logger.info(f"User created: {user_data.get('userId')}")
        return True
    except Exception as e:
        logger.error("Error creating user", exc_info=e)
        return False


# ================================================================
# Chat Session Operations
# ================================================================

def create_chat_session(session_data: Dict) -> bool:
    """Create a new chat session"""
    try:
        table = get_table(CHAT_SESSIONS_TABLE)
        session_data["createdAt"] = datetime.utcnow().isoformat()
        session_data["ttl"] = get_ttl_timestamp(30)  # 30 days TTL
        table.put_item(Item=session_data)
        logger.info(f"Chat session created: {session_data.get('sessionId')}")
        return True
    except Exception as e:
        logger.error("Error creating chat session", exc_info=e)
        return False


def get_chat_session(session_id: str) -> Optional[Dict]:
    """Get chat session by ID"""
    try:
        table = get_table(CHAT_SESSIONS_TABLE)
        response = table.get_item(Key={"sessionId": session_id})
        return decimal_to_float(response.get("Item"))
    except Exception as e:
        logger.error(f"Error getting chat session {session_id}", exc_info=e)
        return None


def update_chat_session(session_id: str, updates: Dict) -> bool:
    """Update chat session"""
    try:
        table = get_table(CHAT_SESSIONS_TABLE)

        # Build update expression
        update_expr = "SET " + ", ".join([f"#{k} = :{k}" for k in updates.keys()])
        expr_attr_names = {f"#{k}": k for k in updates.keys()}
        expr_attr_values = {f":{k}": v for k, v in updates.items()}

        table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values
        )
        logger.info(f"Chat session updated: {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating chat session {session_id}", exc_info=e)
        return False


def get_user_chat_sessions(user_id: str, limit: int = 20) -> List[Dict]:
    """Get chat sessions for a user"""
    try:
        table = get_table(CHAT_SESSIONS_TABLE)
        response = table.query(
            IndexName="userId-timestamp-index",
            KeyConditionExpression="userId = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ScanIndexForward=False,  # Most recent first
            Limit=limit
        )
        return decimal_to_float(response.get("Items", []))
    except Exception as e:
        logger.error(f"Error getting chat sessions for user {user_id}", exc_info=e)
        return []


# ================================================================
# Chat Message Operations
# ================================================================

def save_chat_message(message_data: Dict) -> bool:
    """Save a chat message"""
    try:
        table = get_table(CHAT_MESSAGES_TABLE)
        message_data["timestamp"] = datetime.utcnow().isoformat()
        table.put_item(Item=message_data)
        logger.info(f"Chat message saved: {message_data.get('messageId')}")
        return True
    except Exception as e:
        logger.error("Error saving chat message", exc_info=e)
        return False


def get_chat_messages(session_id: str, limit: int = 50) -> List[Dict]:
    """Get messages for a chat session"""
    try:
        table = get_table(CHAT_MESSAGES_TABLE)
        response = table.query(
            KeyConditionExpression="sessionId = :sid",
            ExpressionAttributeValues={":sid": session_id},
            ScanIndexForward=True,  # Oldest first (chronological order)
            Limit=limit
        )
        return decimal_to_float(response.get("Items", []))
    except Exception as e:
        logger.error(f"Error getting messages for session {session_id}", exc_info=e)
        return []


# ================================================================
# Policy Operations
# ================================================================

def save_policy(policy_data: Dict) -> bool:
    """Save a generated policy"""
    try:
        table = get_table(POLICIES_TABLE)
        policy_data["createdAt"] = datetime.utcnow().isoformat()
        table.put_item(Item=policy_data)
        logger.info(f"Policy saved: {policy_data.get('policyId')}")
        return True
    except Exception as e:
        logger.error("Error saving policy", exc_info=e)
        return False


def get_user_policies(user_id: str, limit: int = 20) -> List[Dict]:
    """Get policies created by a user"""
    try:
        table = get_table(POLICIES_TABLE)
        response = table.query(
            IndexName="userId-createdAt-index",
            KeyConditionExpression="userId = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ScanIndexForward=False,  # Most recent first
            Limit=limit
        )
        return decimal_to_float(response.get("Items", []))
    except Exception as e:
        logger.error(f"Error getting policies for user {user_id}", exc_info=e)
        return []


# ================================================================
# User Usage / Rate Limiting Operations
# ================================================================

def increment_user_usage(user_id: str) -> int:
    """
    Increment usage counter for a user

    Returns:
        Current usage count after increment
    """
    try:
        table = get_table(USER_USAGE_TABLE)
        response = table.update_item(
            Key={"userId": user_id},
            UpdateExpression="ADD requestCount :inc SET lastRequest = :now, #ttl = :ttl",
            ExpressionAttributeNames={"#ttl": "ttl"},
            ExpressionAttributeValues={
                ":inc": 1,
                ":now": datetime.utcnow().isoformat(),
                ":ttl": get_ttl_timestamp(7)  # 7 days TTL
            },
            ReturnValues="UPDATED_NEW"
        )
        count = int(response["Attributes"]["requestCount"])
        logger.info(f"User usage incremented: {user_id} -> {count}")
        return count
    except Exception as e:
        logger.error(f"Error incrementing usage for user {user_id}", exc_info=e)
        return 0


def get_user_usage(user_id: str) -> Dict:
    """Get usage stats for a user"""
    try:
        table = get_table(USER_USAGE_TABLE)
        response = table.get_item(Key={"userId": user_id})
        return decimal_to_float(response.get("Item", {"requestCount": 0}))
    except Exception as e:
        logger.error(f"Error getting usage for user {user_id}", exc_info=e)
        return {"requestCount": 0}


__all__ = [
    "get_user",
    "create_user",
    "create_chat_session",
    "get_chat_session",
    "update_chat_session",
    "get_user_chat_sessions",
    "save_chat_message",
    "get_chat_messages",
    "save_policy",
    "get_user_policies",
    "increment_user_usage",
    "get_user_usage",
    "decimal_to_float",
    "get_ttl_timestamp"
]
