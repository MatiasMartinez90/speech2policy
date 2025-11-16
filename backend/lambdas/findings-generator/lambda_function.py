"""
Findings Generator - IAM Copilot
Automatically detect security issues in IAM roles and policies
"""
import json
import os
import uuid
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource('dynamodb')

ROLES_TABLE = os.environ['ROLES_TABLE_NAME']
POLICIES_TABLE = os.environ['POLICIES_TABLE_NAME']
FINDINGS_TABLE = os.environ['FINDINGS_TABLE_NAME']
ACCOUNTS_TABLE = os.environ['ACCOUNTS_TABLE_NAME']

roles_table = dynamodb.Table(ROLES_TABLE)
policies_table = dynamodb.Table(POLICIES_TABLE)
findings_table = dynamodb.Table(FINDINGS_TABLE)
accounts_table = dynamodb.Table(ACCOUNTS_TABLE)


@tracer.capture_method
def generate_wildcard_finding(resource_type: str, resource_item: Dict, account_id: str, org_id: str) -> Optional[Dict]:
    """
    Generate finding for wildcard actions or resources
    """
    resource_id = resource_item.get(f'{resource_type}Id')
    resource_name = resource_item.get(f'{resource_type}Name')
    resource_arn = resource_item.get(f'{resource_type}Arn')
    
    # Check if has wildcard risk factors
    risk_factors = resource_item.get('riskFactors', [])
    
    has_wildcard_actions = any('wildcard' in f and 'action' in f for f in risk_factors)
    has_wildcard_resources = any('wildcard' in f and 'resource' in f for f in risk_factors)
    
    if not (has_wildcard_actions or has_wildcard_resources):
        return None
    
    severity = 'HIGH' if has_wildcard_actions else 'MEDIUM'
    
    title = f"Overly Permissive {resource_type.title()}: {resource_name}"
    
    description_parts = []
    if has_wildcard_actions:
        description_parts.append("Contains wildcard actions (Action: *)")
    if has_wildcard_resources:
        description_parts.append("Contains wildcard resources (Resource: *)")
    
    description = f"This {resource_type} has overly broad permissions. " + " and ".join(description_parts) + ". This violates the principle of least privilege."
    
    recommendation = f"Restrict the {resource_type} to only the specific actions and resources required. Review CloudTrail logs to identify actual usage patterns."
    
    # Generate suggested fix
    suggested_fix = {
        'type': 'restrict-permissions',
        'description': 'Remove wildcards and specify explicit actions/resources',
        'steps': [
            '1. Review CloudTrail logs for actual API calls',
            '2. Identify minimum required permissions',
            '3. Update policy to use explicit actions and resources',
            '4. Test changes in non-production environment',
            '5. Apply changes using IAM Copilot Apply workflow'
        ]
    }
    
    return {
        'findingId': str(uuid.uuid4()),
        'orgId': org_id,
        'accountId': account_id,
        'resourceType': resource_type,
        'resourceId': resource_id,
        'resourceArn': resource_arn,
        'title': title,
        'description': description,
        'severity': severity,
        'category': 'wildcard',
        'recommendation': recommendation,
        'suggestedFix': suggested_fix,
        'status': 'open',
        'createdAt': int(datetime.utcnow().timestamp()),
        'ttl': int((datetime.utcnow() + timedelta(days=180)).timestamp())
    }


@tracer.capture_method
def generate_privilege_escalation_finding(role_item: Dict, account_id: str, org_id: str) -> Optional[Dict]:
    """
    Detect privilege escalation risks (e.g., PassRole + CreateFunction)
    """
    risk_factors = role_item.get('riskFactors', [])
    
    if not any('privilege-escalation' in f for f in risk_factors):
        return None
    
    role_id = role_item.get('roleId')
    role_name = role_item.get('roleName')
    role_arn = role_item.get('roleArn')
    
    title = f"Privilege Escalation Risk: {role_name}"
    
    description = (
        f"This role has a dangerous combination of permissions that could allow privilege escalation. "
        f"The combination of iam:PassRole with lambda:CreateFunction, ec2:RunInstances, or similar actions "
        f"allows an attacker to create resources with elevated permissions."
    )
    
    recommendation = (
        "1. Separate PassRole permissions into a dedicated role\n"
        "2. Add conditions to PassRole to restrict which roles can be passed\n"
        "3. Consider using service-specific roles instead of broad PassRole permissions"
    )
    
    suggested_fix = {
        'type': 'restrict-passrole',
        'description': 'Add conditions to PassRole action',
        'example': {
            'Effect': 'Allow',
            'Action': 'iam:PassRole',
            'Resource': 'arn:aws:iam::*:role/SpecificRoleName',
            'Condition': {
                'StringEquals': {
                    'iam:PassedToService': 'lambda.amazonaws.com'
                }
            }
        }
    }
    
    return {
        'findingId': str(uuid.uuid4()),
        'orgId': org_id,
        'accountId': account_id,
        'resourceType': 'role',
        'resourceId': role_id,
        'resourceArn': role_arn,
        'title': title,
        'description': description,
        'severity': 'CRITICAL',
        'category': 'privilege-escalation',
        'recommendation': recommendation,
        'suggestedFix': suggested_fix,
        'status': 'open',
        'createdAt': int(datetime.utcnow().timestamp()),
        'ttl': int((datetime.utcnow() + timedelta(days=180)).timestamp())
    }


@tracer.capture_method
def generate_admin_access_finding(resource_type: str, resource_item: Dict, account_id: str, org_id: str) -> Optional[Dict]:
    """
    Detect admin-level access (Action: *, iam:*, etc.)
    """
    risk_factors = resource_item.get('riskFactors', [])
    
    admin_factors = [f for f in risk_factors if 'admin-action' in f]
    if not admin_factors:
        return None
    
    resource_id = resource_item.get(f'{resource_type}Id')
    resource_name = resource_item.get(f'{resource_type}Name')
    resource_arn = resource_item.get(f'{resource_type}Arn')
    
    # Check if it's AdministratorAccess managed policy
    if resource_type == 'role':
        attached_policies = resource_item.get('attachedPolicies', [])
        has_admin_policy = any('AdministratorAccess' in p.get('policyName', '') for p in attached_policies)
        
        if has_admin_policy:
            severity = 'CRITICAL'
            title = f"Administrator Access Detected: {resource_name}"
            description = f"This role has the AWS managed AdministratorAccess policy attached, granting full access to all AWS services and resources."
        else:
            severity = 'HIGH'
            title = f"Admin-Level Permissions: {resource_name}"
            description = f"This role has admin-level permissions through inline or custom policies."
    else:
        severity = 'HIGH'
        title = f"Admin-Level Policy: {resource_name}"
        description = f"This policy grants admin-level access to AWS services."
    
    recommendation = (
        "1. Review if admin access is truly required\n"
        "2. Consider using more specific managed policies (e.g., PowerUserAccess, ReadOnlyAccess)\n"
        "3. If admin access is needed, implement:\n"
        "   - MFA requirement via condition\n"
        "   - IP restriction via condition\n"
        "   - Time-based access (temporary elevation)\n"
        "4. Enable CloudTrail logging and set up alerts for admin actions"
    )
    
    suggested_fix = {
        'type': 'replace-policy',
        'description': 'Replace with least-privilege alternatives',
        'alternatives': [
            'PowerUserAccess (excludes IAM and Organizations)',
            'ReadOnlyAccess (audit and monitoring)',
            'Custom policy with specific permissions'
        ]
    }
    
    return {
        'findingId': str(uuid.uuid4()),
        'orgId': org_id,
        'accountId': account_id,
        'resourceType': resource_type,
        'resourceId': resource_id,
        'resourceArn': resource_arn,
        'title': title,
        'description': description,
        'severity': severity,
        'category': 'least-privilege',
        'recommendation': recommendation,
        'suggestedFix': suggested_fix,
        'status': 'open',
        'createdAt': int(datetime.utcnow().timestamp()),
        'ttl': int((datetime.utcnow() + timedelta(days=180)).timestamp())
    }


@tracer.capture_method
def generate_high_risk_finding(resource_type: str, resource_item: Dict, account_id: str, org_id: str) -> Optional[Dict]:
    """
    Generate finding for high risk score resources
    """
    risk_score = resource_item.get('riskScore', 0)
    risk_level = resource_item.get('riskLevel')
    
    if risk_level not in ['HIGH', 'CRITICAL']:
        return None
    
    resource_id = resource_item.get(f'{resource_type}Id')
    resource_name = resource_item.get(f'{resource_type}Name')
    resource_arn = resource_item.get(f'{resource_type}Arn')
    
    # Skip if we already generated specific findings for this resource
    # This is a catch-all for high-risk resources
    risk_factors = resource_item.get('riskFactors', [])
    if any(f in str(risk_factors) for f in ['admin-action', 'wildcard-all-actions', 'privilege-escalation']):
        return None  # More specific findings will be generated
    
    title = f"High-Risk {resource_type.title()}: {resource_name}"
    description = f"This {resource_type} has a risk score of {risk_score}/100, indicating potential security concerns."
    
    if risk_factors:
        description += f"\n\nRisk factors detected:\n" + "\n".join(f"- {factor}" for factor in risk_factors[:5])
    
    recommendation = f"Review this {resource_type}'s permissions and apply least privilege principle. Use IAM Copilot's AI Builder to generate a safer alternative."
    
    return {
        'findingId': str(uuid.uuid4()),
        'orgId': org_id,
        'accountId': account_id,
        'resourceType': resource_type,
        'resourceId': resource_id,
        'resourceArn': resource_arn,
        'title': title,
        'description': description,
        'severity': risk_level,
        'category': 'least-privilege',
        'recommendation': recommendation,
        'suggestedFix': {
            'type': 'analyze-with-ai',
            'description': 'Use AI Builder to generate optimized policy'
        },
        'status': 'open',
        'createdAt': int(datetime.utcnow().timestamp()),
        'ttl': int((datetime.utcnow() + timedelta(days=180)).timestamp())
    }


@tracer.capture_method
def analyze_and_generate_findings(account_id: str, org_id: str) -> List[Dict]:
    """
    Analyze all resources in account and generate findings
    """
    findings = []
    
    # Get all roles for this account
    roles_response = roles_table.query(
        IndexName='accountId-riskScore-index',
        KeyConditionExpression='accountId = :accountId',
        ExpressionAttributeValues={':accountId': account_id}
    )
    
    for role in roles_response.get('Items', []):
        # Check for wildcard
        wildcard_finding = generate_wildcard_finding('role', role, account_id, org_id)
        if wildcard_finding:
            findings.append(wildcard_finding)
        
        # Check for privilege escalation
        priv_esc_finding = generate_privilege_escalation_finding(role, account_id, org_id)
        if priv_esc_finding:
            findings.append(priv_esc_finding)
        
        # Check for admin access
        admin_finding = generate_admin_access_finding('role', role, account_id, org_id)
        if admin_finding:
            findings.append(admin_finding)
        
        # High risk catch-all
        high_risk_finding = generate_high_risk_finding('role', role, account_id, org_id)
        if high_risk_finding:
            findings.append(high_risk_finding)
    
    # Get all policies for this account
    policies_response = policies_table.query(
        IndexName='accountId-riskScore-index',
        KeyConditionExpression='accountId = :accountId',
        ExpressionAttributeValues={':accountId': account_id}
    )
    
    for policy in policies_response.get('Items', []):
        # Check for wildcard
        wildcard_finding = generate_wildcard_finding('policy', policy, account_id, org_id)
        if wildcard_finding:
            findings.append(wildcard_finding)
        
        # Check for admin access
        admin_finding = generate_admin_access_finding('policy', policy, account_id, org_id)
        if admin_finding:
            findings.append(admin_finding)
        
        # High risk catch-all
        high_risk_finding = generate_high_risk_finding('policy', policy, account_id, org_id)
        if high_risk_finding:
            findings.append(high_risk_finding)
    
    return findings


@tracer.capture_method
def save_findings(findings: List[Dict]) -> int:
    """
    Save findings to DynamoDB (deduplicate by title + resourceId)
    """
    saved_count = 0
    
    for finding in findings:
        # Check if finding already exists (same title + resourceId + status=open)
        existing = findings_table.query(
            IndexName='accountId-status-index',
            KeyConditionExpression='accountId = :accountId AND #status = :status',
            FilterExpression='title = :title AND resourceId = :resourceId',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':accountId': finding['accountId'],
                ':status': 'open',
                ':title': finding['title'],
                ':resourceId': finding['resourceId']
            }
        )
        
        if existing.get('Items'):
            logger.info(f"Finding already exists: {finding['title']}")
            continue
        
        # Save new finding
        findings_table.put_item(Item=finding)
        saved_count += 1
        logger.info(f"Created finding: {finding['title']}")
    
    return saved_count


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: Dict, context: LambdaContext) -> Dict:
    """
    Generate security findings for IAM resources
    
    Event can specify:
    - accountId: analyze specific account
    - Or run for all accounts
    """
    logger.info("Findings Generator started", extra={"event": event})
    
    try:
        # Get account to analyze
        if 'accountId' in event:
            account_ids = [event['accountId']]
        else:
            # Get all connected accounts
            response = accounts_table.query(
                IndexName='status-index',
                KeyConditionExpression='#status = :connected',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':connected': 'connected'}
            )
            account_ids = [item['accountId'] for item in response.get('Items', [])]
        
        logger.info(f"Analyzing {len(account_ids)} account(s)")
        
        total_findings = 0
        results = []
        
        for account_id in account_ids:
            try:
                # Get account details for orgId
                account = accounts_table.get_item(Key={'accountId': account_id})['Item']
                org_id = account['orgId']
                
                logger.info(f"Generating findings for account: {account.get('accountName', account_id)}")
                
                # Generate findings
                findings = analyze_and_generate_findings(account_id, org_id)
                
                # Save findings
                saved_count = save_findings(findings)
                total_findings += saved_count
                
                # Update account with findings count
                accounts_table.update_item(
                    Key={'accountId': account_id},
                    UpdateExpression='SET syncStatus.findingsCount = :count',
                    ExpressionAttributeValues={':count': saved_count}
                )
                
                results.append({
                    'accountId': account_id,
                    'findingsGenerated': len(findings),
                    'findingsSaved': saved_count
                })
                
            except Exception as e:
                logger.error(f"Failed to generate findings for account {account_id}: {str(e)}")
                results.append({
                    'accountId': account_id,
                    'error': str(e)
                })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Generated {total_findings} new findings',
                'results': results
            })
        }
        
    except Exception as e:
        logger.error(f"Findings generator failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
