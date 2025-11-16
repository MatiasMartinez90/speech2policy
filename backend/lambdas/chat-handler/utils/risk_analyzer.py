"""
Risk Analyzer - Analyzes IAM policies for security risks and assigns risk scores
"""

import sys
sys.path.append("/opt/python")
sys.path.append("../../shared")

from shared.logger import logger
from shared.validators import detect_dangerous_permissions, calculate_risk_score


def analyze_policy_risk(policy: dict) -> dict:
    """
    Analyze an IAM policy for security risks

    Args:
        policy: IAM policy dict

    Returns:
        Dict with:
            - score: Risk score (0-100)
            - level: Risk level (SAFE, LOW, MEDIUM, HIGH, CRITICAL)
            - warnings: List of specific warnings
            - summary: Human-readable summary
    """
    try:
        logger.info("Analyzing policy risk")

        # Calculate risk score
        score = calculate_risk_score(policy)

        # Determine risk level
        if score == 0:
            level = "SAFE"
        elif score < 20:
            level = "LOW"
        elif score < 40:
            level = "MEDIUM"
        elif score < 70:
            level = "HIGH"
        else:
            level = "CRITICAL"

        # Get detailed warnings
        warnings = detect_dangerous_permissions(policy)

        # Generate summary
        summary = generate_risk_summary(score, level, warnings)

        result = {
            "score": score,
            "level": level,
            "warnings": warnings,
            "summary": summary
        }

        logger.info(f"Risk analysis complete - Score: {score}, Level: {level}, Warnings: {len(warnings)}")
        return result

    except Exception as e:
        logger.error("Error analyzing policy risk", exc_info=e)
        return {
            "score": 0,
            "level": "UNKNOWN",
            "warnings": [],
            "summary": "Unable to analyze risk"
        }


def generate_risk_summary(score: int, level: str, warnings: list) -> str:
    """
    Generate a human-readable risk summary

    Args:
        score: Risk score
        level: Risk level
        warnings: List of warnings

    Returns:
        Summary string
    """
    if score == 0:
        return "✅ This policy appears safe with no obvious security risks."

    critical_count = sum(1 for w in warnings if w.get("severity") == "CRITICAL")
    high_count = sum(1 for w in warnings if w.get("severity") == "HIGH")
    medium_count = sum(1 for w in warnings if w.get("severity") == "MEDIUM")

    parts = []

    if level == "CRITICAL":
        parts.append("🚨 CRITICAL RISK DETECTED!")
    elif level == "HIGH":
        parts.append("⚠️ HIGH RISK - Review carefully!")
    elif level == "MEDIUM":
        parts.append("⚠️ MEDIUM RISK - Some concerns found.")
    else:
        parts.append("✓ LOW RISK - Minor issues found.")

    issue_parts = []
    if critical_count:
        issue_parts.append(f"{critical_count} critical issue{'s' if critical_count > 1 else ''}")
    if high_count:
        issue_parts.append(f"{high_count} high-severity issue{'s' if high_count > 1 else ''}")
    if medium_count:
        issue_parts.append(f"{medium_count} medium-severity issue{'s' if medium_count > 1 else ''}")

    if issue_parts:
        parts.append(f"Found {', '.join(issue_parts)}.")

    return " ".join(parts)


__all__ = ["analyze_policy_risk", "generate_risk_summary"]
