"""
Policy Generator - Bedrock integration for IAM policy generation

Uses Amazon Bedrock (Claude 3.5 Sonnet) to convert natural language
requests into IAM policy JSON
"""

import json
import boto3
import os
from typing import Dict, List, Optional

import sys
sys.path.append("/opt/python")
sys.path.append("../../shared")

from shared.logger import logger


# Bedrock client
bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.environ.get("AWS_REGION", "us-east-1")
)

# Model ID
MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"


class PolicyGenerationError(Exception):
    """Exception raised when policy generation fails"""
    pass


SYSTEM_PROMPT = """You are an AWS IAM expert assistant. Your job is to help users create secure, least-privilege IAM policies.

IMPORTANT RULES:
1. ALWAYS follow the principle of least privilege
2. NEVER use "Effect": "Allow", "Action": "*" unless explicitly required and confirmed
3. Specify Resource ARNs when possible (avoid wildcard "*" resources)
4. Add security Conditions when appropriate (MFA, SourceIP, time-based, etc.)
5. If the request is ambiguous, ask clarifying questions
6. Explain trade-offs and security implications
7. When generating a policy, ALWAYS respond with valid JSON wrapped in ```json``` code blocks

RESPONSE FORMAT:
When generating a policy, use this format:

For clarifying questions:
Just ask the question naturally, like:
"Do you need ListBucket permissions too, or just GetObject?"

When providing a policy:
First explain what it does, then provide the JSON:

"This policy allows read-only access to S3 bucket 'data-prod'. It grants:
- s3:GetObject - to download objects
- s3:ListBucket - to list objects

Here's the policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::data-prod/*",
      "arn:aws:s3:::data-prod"
    ]
  }]
}
```

⚠️ Warning: This allows access to all objects in the bucket. Consider adding conditions if you want to restrict access further."

IMPORTANT: Always include the policy JSON in a ```json``` code block.
"""


def generate_policy_from_text(
    user_message: str,
    conversation_history: Optional[List[Dict]] = None
) -> Dict:
    """
    Generate IAM policy from natural language using Bedrock

    Args:
        user_message: User's message/request
        conversation_history: Optional list of previous messages

    Returns:
        Dict with:
            - text: AI response text
            - policyJson: Extracted policy JSON (if generated)
            - needsClarification: Boolean indicating if AI is asking questions

    Raises:
        PolicyGenerationError: If generation fails
    """
    try:
        logger.info(f"Generating policy for message: {user_message[:100]}...")

        # Build conversation messages
        messages = []

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                role = msg.get("role")
                content = msg.get("content")
                if role and content:
                    messages.append({
                        "role": role,
                        "content": content
                    })

        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })

        # Prepare Bedrock request
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "system": SYSTEM_PROMPT,
            "messages": messages,
            "temperature": 0.3,  # Lower temperature for more consistent output
        }

        logger.info(f"Calling Bedrock with model: {MODEL_ID}")

        # Call Bedrock
        response = bedrock_runtime.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response["body"].read())
        logger.info(f"Bedrock response: {response_body}")

        # Extract AI text
        content_blocks = response_body.get("content", [])
        if not content_blocks:
            raise PolicyGenerationError("Empty response from Bedrock")

        ai_text = content_blocks[0].get("text", "")

        # Try to extract policy JSON from response
        policy_json = extract_policy_from_response(ai_text)

        # Determine if AI is asking for clarification (no policy generated)
        needs_clarification = policy_json is None and "?" in ai_text

        result = {
            "text": ai_text,
            "policyJson": policy_json,
            "needsClarification": needs_clarification
        }

        logger.info(f"Generated response - Has policy: {policy_json is not None}")
        return result

    except Exception as e:
        logger.error("Error generating policy with Bedrock", exc_info=e)
        raise PolicyGenerationError(f"Failed to generate policy: {str(e)}")


def extract_policy_from_response(text: str) -> Optional[Dict]:
    """
    Extract IAM policy JSON from AI response text

    Looks for JSON code blocks in markdown format

    Args:
        text: AI response text

    Returns:
        Policy dict or None if not found
    """
    try:
        # Look for ```json ... ``` blocks
        import re

        json_pattern = r"```json\s*\n(.*?)\n```"
        matches = re.findall(json_pattern, text, re.DOTALL)

        if matches:
            # Parse the first JSON block
            policy_str = matches[0].strip()
            policy = json.loads(policy_str)

            # Validate it looks like an IAM policy
            if "Version" in policy and "Statement" in policy:
                logger.info("Successfully extracted policy from response")
                return policy

        logger.info("No policy JSON found in response")
        return None

    except json.JSONDecodeError as e:
        logger.warning(f"Found JSON block but failed to parse: {e}")
        return None
    except Exception as e:
        logger.error("Error extracting policy from response", exc_info=e)
        return None


__all__ = ["generate_policy_from_text", "PolicyGenerationError"]
