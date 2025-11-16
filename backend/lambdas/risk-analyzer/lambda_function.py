"""
Risk Analyzer - IAM Copilot
Calculates risk scores for IAM roles and policies
"""
import json
import os
import boto3
from typing import Dict, List, Tuple
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource('dynamodb')

ROLES_TABLE = os.environ['ROLES_TABLE_NAME']
POLICIES_TABLE = os.environ['POLICIES_TABLE_NAME']

roles_table = dynamodb.Table(ROLES_TABLE)
policies_table = dynamodb.Table(POLICIES_TABLE)

# Dangerous IAM actions that grant significant privileges
DANGEROUS_ACTIONS = [
    'iam:*',
    'iam:CreateUser',
    'iam:CreateAccessKey',
    'iam:AttachUserPolicy',
    'iam:AttachRolePolicy',
    'iam:PutUserPolicy',
    'iam:PutRolePolicy',
    'iam:PassRole',
    'iam:UpdateAssumeRolePolicy',
    'sts:AssumeRole',
    's3:DeleteBucket',
    's3:PutBucketPolicy',
    'lambda:CreateFunction',
    'lambda:UpdateFunctionCode',
    'ec2:RunInstances',
    'dynamodb:DeleteTable',
    'rds:DeleteDBInstance',
    'cloudformation:CreateStack',
    'cloudformation:UpdateStack',
]

# Admin-level actions
ADMIN_ACTIONS = ['*', 'iam:*', 's3:*', 'ec2:*', 'lambda:*']


@tracer.capture_method
def analyze_policy_document(policy_doc: Dict) -> Tuple[int, List[str]]:
    """
    Analyze a policy document and calculate risk score
    
    Returns:
        Tuple of (risk_score, risk_factors)
    """
    risk_score = 0
    risk_factors = []
    
    statements = policy_doc.get('Statement', [])
    if not isinstance(statements, list):
        statements = [statements]
    
    for statement in statements:
        effect = statement.get('Effect', 'Allow')
        
        # Only analyze Allow statements
        if effect != 'Allow':
            continue
        
        actions = statement.get('Action', [])
        if not isinstance(actions, list):
            actions = [actions]
        
        resources = statement.get('Resource', [])
        if not isinstance(resources, list):
            resources = [resources]
        
        # Check for wildcard actions
        if '*' in actions:
            risk_score += 50
            risk_factors.append('wildcard-all-actions')
        
        # Check for admin-level actions
        for action in actions:
            if action in ADMIN_ACTIONS:
                risk_score += 30
                risk_factors.append(f'admin-action:{action}')
            elif action in DANGEROUS_ACTIONS:
                risk_score += 20
                risk_factors.append(f'dangerous-action:{action}')
            elif action.endswith(':*'):
                # Service-level wildcard (e.g., s3:*)
                risk_score += 15
                risk_factors.append(f'service-wildcard:{action}')
        
        # Check for wildcard resources
        if '*' in resources:
            risk_score += 25
            risk_factors.append('wildcard-all-resources')
        else:
            # Check for overly broad resources
            for resource in resources:
                if resource.endswith('*'):
                    risk_score += 10
                    risk_factors.append('broad-resources')
        
        # Check for privilege escalation combinations
        if any('iam:PassRole' in a for a in actions):
            if any(a in ['lambda:CreateFunction', 'lambda:UpdateFunctionCode', 'ec2:RunInstances'] for a in actions):
                risk_score += 30
                risk_factors.append('privilege-escalation-risk')
        
        # Check for public access conditions
        conditions = statement.get('Condition', {})
        if not conditions:
            # No conditions means unrestricted access
            if '*' in resources or any(a in ADMIN_ACTIONS for a in actions):
                risk_score += 15
                risk_factors.append('no-conditions')
    
    # Cap risk score at 100
    risk_score = min(risk_score, 100)
    
    # Remove duplicates from risk factors
    risk_factors = list(set(risk_factors))
    
    return risk_score, risk_factors


@tracer.capture_method
def get_risk_level(risk_score: int) -> str:
    """Convert numeric risk score to level"""
    if risk_score >= 70:
        return 'CRITICAL'
    elif risk_score >= 50:
        return 'HIGH'
    elif risk_score >= 30:
        return 'MEDIUM'
    else:
        return 'LOW'


@tracer.capture_method
def analyze_role(role_item: Dict) -> Dict:
    """
    Analyze a role and calculate its risk score
    """
    logger.info(f"Analyzing role: {role_item.get('roleName')}")
    
    total_risk = 0
    all_risk_factors = []
    
    # Analyze trust policy (AssumeRolePolicyDocument)
    trust_policy = role_item.get('trustPolicy', {})
    if trust_policy:
        trust_risk, trust_factors = analyze_policy_document(trust_policy)
        total_risk += (trust_risk * 0.3)  # Trust policy weight: 30%
        all_risk_factors.extend([f'trust:{f}' for f in trust_factors])
    
    # Analyze attached policies
    attached_policies = role_item.get('attachedPolicies', [])
    for policy in attached_policies:
        # If it's an AWS managed policy, assign a base risk
        if 'aws:policy/' in policy.get('policyArn', ''):
            if 'AdministratorAccess' in policy.get('policyName', ''):
                total_risk += 40
                all_risk_factors.append('attached:AdministratorAccess')
            elif 'PowerUserAccess' in policy.get('policyName', ''):
                total_risk += 30
                all_risk_factors.append('attached:PowerUserAccess')
            elif 'FullAccess' in policy.get('policyName', ''):
                total_risk += 20
                all_risk_factors.append('attached:FullAccess-managed-policy')
    
    # Analyze inline policies
    inline_policies = role_item.get('inlinePolicies', [])
    if inline_policies:
        inline_risk_total = 0
        for policy in inline_policies:
            policy_doc = policy.get('policyDocument', {})
            if policy_doc:
                inline_risk, inline_factors = analyze_policy_document(policy_doc)
                inline_risk_total += inline_risk
                all_risk_factors.extend([f'inline:{f}' for f in inline_factors])
        
        # Average inline policy risk, weight: 70%
        if len(inline_policies) > 0:
            total_risk += (inline_risk_total / len(inline_policies)) * 0.7
    
    # Cap at 100
    total_risk = min(int(total_risk), 100)
    risk_level = get_risk_level(total_risk)
    
    return {
        'riskScore': total_risk,
        'riskLevel': risk_level,
        'riskFactors': list(set(all_risk_factors))
    }


@tracer.capture_method
def analyze_policy(policy_item: Dict) -> Dict:
    """
    Analyze a policy and calculate its risk score
    """
    logger.info(f"Analyzing policy: {policy_item.get('policyName')}")
    
    policy_doc = policy_item.get('policyDocument', {})
    
    if not policy_doc:
        return {
            'riskScore': 0,
            'riskLevel': 'UNKNOWN',
            'riskFactors': [],
            'wildcards': {'actions': False, 'resources': False},
            'dangerousPermissions': []
        }
    
    risk_score, risk_factors = analyze_policy_document(policy_doc)
    risk_level = get_risk_level(risk_score)
    
    # Check for wildcards
    wildcards = {
        'actions': any('wildcard' in f and 'action' in f for f in risk_factors),
        'resources': any('wildcard' in f and 'resource' in f for f in risk_factors)
    }
    
    # Extract dangerous permissions
    dangerous_perms = [f.split(':')[1] for f in risk_factors if 'dangerous-action:' in f or 'admin-action:' in f]
    
    return {
        'riskScore': risk_score,
        'riskLevel': risk_level,
        'riskFactors': risk_factors,
        'wildcards': wildcards,
        'dangerousPermissions': dangerous_perms
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: Dict, context: LambdaContext) -> Dict:
    """
    Analyze risk for roles and policies
    
    Event can specify:
    - resourceType: 'role' or 'policy'
    - resourceId: specific role/policy to analyze
    - accountId: analyze all resources in account
    """
    logger.info("Risk Analyzer started", extra={"event": event})
    
    try:
        resource_type = event.get('resourceType')
        resource_id = event.get('resourceId')
        account_id = event.get('accountId')
        
        results = []
        
        # Analyze specific resource
        if resource_id:
            if resource_type == 'role':
                role = roles_table.get_item(Key={'roleId': resource_id})['Item']
                analysis = analyze_role(role)
                
                # Update role with risk analysis
                roles_table.update_item(
                    Key={'roleId': resource_id},
                    UpdateExpression='SET riskScore = :score, riskLevel = :level, riskFactors = :factors',
                    ExpressionAttributeValues={
                        ':score': analysis['riskScore'],
                        ':level': analysis['riskLevel'],
                        ':factors': analysis['riskFactors']
                    }
                )
                
                results.append({'roleId': resource_id, **analysis})
                
            elif resource_type == 'policy':
                policy = policies_table.get_item(Key={'policyId': resource_id})['Item']
                analysis = analyze_policy(policy)
                
                # Update policy with risk analysis
                policies_table.update_item(
                    Key={'policyId': resource_id},
                    UpdateExpression='SET riskScore = :score, riskLevel = :level, riskFactors = :factors, wildcards = :wildcards, dangerousPermissions = :dangerous',
                    ExpressionAttributeValues={
                        ':score': analysis['riskScore'],
                        ':level': analysis['riskLevel'],
                        ':factors': analysis['riskFactors'],
                        ':wildcards': analysis['wildcards'],
                        ':dangerous': analysis['dangerousPermissions']
                    }
                )
                
                results.append({'policyId': resource_id, **analysis})
        
        # Analyze all resources in account
        elif account_id:
            # Analyze all roles
            roles_response = roles_table.query(
                IndexName='accountId-riskScore-index',
                KeyConditionExpression='accountId = :accountId',
                ExpressionAttributeValues={':accountId': account_id}
            )
            
            for role in roles_response.get('Items', []):
                try:
                    analysis = analyze_role(role)
                    roles_table.update_item(
                        Key={'roleId': role['roleId']},
                        UpdateExpression='SET riskScore = :score, riskLevel = :level, riskFactors = :factors',
                        ExpressionAttributeValues={
                            ':score': analysis['riskScore'],
                            ':level': analysis['riskLevel'],
                            ':factors': analysis['riskFactors']
                        }
                    )
                    results.append({'roleId': role['roleId'], **analysis})
                except Exception as e:
                    logger.error(f"Failed to analyze role {role['roleId']}: {str(e)}")
            
            # Analyze all policies
            policies_response = policies_table.query(
                IndexName='accountId-riskScore-index',
                KeyConditionExpression='accountId = :accountId',
                ExpressionAttributeValues={':accountId': account_id}
            )
            
            for policy in policies_response.get('Items', []):
                try:
                    analysis = analyze_policy(policy)
                    policies_table.update_item(
                        Key={'policyId': policy['policyId']},
                        UpdateExpression='SET riskScore = :score, riskLevel = :level, riskFactors = :factors, wildcards = :wildcards, dangerousPermissions = :dangerous',
                        ExpressionAttributeValues={
                            ':score': analysis['riskScore'],
                            ':level': analysis['riskLevel'],
                            ':factors': analysis['riskFactors'],
                            ':wildcards': analysis['wildcards'],
                            ':dangerous': analysis['dangerousPermissions']
                        }
                    )
                    results.append({'policyId': policy['policyId'], **analysis})
                except Exception as e:
                    logger.error(f"Failed to analyze policy {policy['policyId']}: {str(e)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Analyzed {len(results)} resource(s)',
                'results': results
            })
        }
        
    except Exception as e:
        logger.error(f"Risk analysis failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
