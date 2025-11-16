"""
AWS Sync Handler - IAM Copilot
Assumes role in customer AWS account and syncs IAM data
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

# AWS clients
sts = boto3.client('sts')
dynamodb = boto3.resource('dynamodb')

# Environment variables
ROLES_TABLE = os.environ['ROLES_TABLE_NAME']
POLICIES_TABLE = os.environ['POLICIES_TABLE_NAME']
ACCOUNTS_TABLE = os.environ['ACCOUNTS_TABLE_NAME']

roles_table = dynamodb.Table(ROLES_TABLE)
policies_table = dynamodb.Table(POLICIES_TABLE)
accounts_table = dynamodb.Table(ACCOUNTS_TABLE)


@tracer.capture_method
def assume_role(role_arn: str, external_id: str) -> boto3.client:
    """
    Assume role in customer AWS account with external ID
    
    Args:
        role_arn: ARN of the IAMCopilotReadRole in customer account
        external_id: External ID for security
        
    Returns:
        IAM client with assumed role credentials
    """
    logger.info(f"Assuming role: {role_arn}")
    
    try:
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName='IAMCopilot-Sync',
            ExternalId=external_id,
            DurationSeconds=3600
        )
        
        credentials = response['Credentials']
        
        # Create IAM client with assumed role credentials
        iam_client = boto3.client(
            'iam',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        
        logger.info("Successfully assumed role")
        return iam_client
        
    except Exception as e:
        logger.error(f"Failed to assume role: {str(e)}")
        raise


@tracer.capture_method
def sync_roles(iam_client: boto3.client, account_id: str) -> int:
    """
    Sync all IAM roles from customer account
    
    Args:
        iam_client: IAM client with assumed role credentials
        account_id: Internal account ID (DynamoDB key)
        
    Returns:
        Number of roles synced
    """
    logger.info("Starting roles sync")
    roles_synced = 0
    
    try:
        # List all roles
        paginator = iam_client.get_paginator('list_roles')
        
        for page in paginator.paginate():
            for role in page['Roles']:
                role_name = role['RoleName']
                role_arn = role['Arn']
                
                logger.info(f"Syncing role: {role_name}")
                
                # Get attached policies
                attached_policies = []
                try:
                    policy_paginator = iam_client.get_paginator('list_attached_role_policies')
                    for policy_page in policy_paginator.paginate(RoleName=role_name):
                        for policy in policy_page['AttachedPolicies']:
                            attached_policies.append({
                                'policyArn': policy['PolicyArn'],
                                'policyName': policy['PolicyName']
                            })
                except Exception as e:
                    logger.warning(f"Failed to get attached policies for {role_name}: {str(e)}")
                
                # Get inline policies
                inline_policies = []
                try:
                    inline_policy_names = iam_client.list_role_policies(RoleName=role_name)
                    for policy_name in inline_policy_names.get('PolicyNames', []):
                        policy_doc = iam_client.get_role_policy(
                            RoleName=role_name,
                            PolicyName=policy_name
                        )
                        inline_policies.append({
                            'policyName': policy_name,
                            'policyDocument': policy_doc['PolicyDocument']
                        })
                except Exception as e:
                    logger.warning(f"Failed to get inline policies for {role_name}: {str(e)}")
                
                # Get role tags
                tags = {}
                try:
                    tag_response = iam_client.list_role_tags(RoleName=role_name)
                    for tag in tag_response.get('Tags', []):
                        tags[tag['Key']] = tag['Value']
                except Exception as e:
                    logger.warning(f"Failed to get tags for {role_name}: {str(e)}")
                
                # Store in DynamoDB
                role_id = f"{account_id}:{role_name}"
                now = int(datetime.utcnow().timestamp())
                
                roles_table.put_item(
                    Item={
                        'roleId': role_id,
                        'accountId': account_id,
                        'roleArn': role_arn,
                        'roleName': role_name,
                        'path': role.get('Path', '/'),
                        'trustPolicy': role['AssumeRolePolicyDocument'],
                        'attachedPolicies': attached_policies,
                        'inlinePolicies': inline_policies,
                        'tags': tags,
                        'riskScore': 0,  # Will be calculated by risk-analyzer
                        'riskLevel': 'UNKNOWN',
                        'lastSynced': now,
                        'createdAt': now,
                        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
                    }
                )
                
                roles_synced += 1
        
        logger.info(f"Synced {roles_synced} roles")
        return roles_synced
        
    except Exception as e:
        logger.error(f"Failed to sync roles: {str(e)}")
        raise


@tracer.capture_method
def sync_policies(iam_client: boto3.client, account_id: str) -> int:
    """
    Sync customer-managed IAM policies
    
    Args:
        iam_client: IAM client with assumed role credentials
        account_id: Internal account ID
        
    Returns:
        Number of policies synced
    """
    logger.info("Starting policies sync")
    policies_synced = 0
    
    try:
        # List customer-managed policies only (Scope: Local)
        paginator = iam_client.get_paginator('list_policies')
        
        for page in paginator.paginate(Scope='Local'):
            for policy in page['Policies']:
                policy_name = policy['PolicyName']
                policy_arn = policy['Arn']
                
                logger.info(f"Syncing policy: {policy_name}")
                
                # Get policy version
                try:
                    policy_version = iam_client.get_policy_version(
                        PolicyArn=policy_arn,
                        VersionId=policy['DefaultVersionId']
                    )
                    policy_document = policy_version['PolicyVersion']['Document']
                except Exception as e:
                    logger.warning(f"Failed to get policy document for {policy_name}: {str(e)}")
                    policy_document = {}
                
                # Get entities attached to (roles, users, groups)
                attached_to_roles = []
                attached_to_users = []
                attached_to_groups = []
                
                try:
                    entities = iam_client.list_entities_for_policy(PolicyArn=policy_arn)
                    for role in entities.get('PolicyRoles', []):
                        attached_to_roles.append(role['RoleArn'])
                    for user in entities.get('PolicyUsers', []):
                        attached_to_users.append(user['UserArn'])
                    for group in entities.get('PolicyGroups', []):
                        attached_to_groups.append(group['GroupArn'])
                except Exception as e:
                    logger.warning(f"Failed to get entities for {policy_name}: {str(e)}")
                
                # Store in DynamoDB
                policy_id = f"{account_id}:{policy_name}"
                now = int(datetime.utcnow().timestamp())
                
                policies_table.put_item(
                    Item={
                        'policyId': policy_id,
                        'accountId': account_id,
                        'policyArn': policy_arn,
                        'policyName': policy_name,
                        'policyType': 'Managed',
                        'policyDocument': policy_document,
                        'attachedToRoles': attached_to_roles,
                        'attachedToUsers': attached_to_users,
                        'attachedToGroups': attached_to_groups,
                        'riskScore': 0,  # Will be calculated by risk-analyzer
                        'riskLevel': 'UNKNOWN',
                        'lastSynced': now,
                        'createdAt': now,
                        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
                    }
                )
                
                policies_synced += 1
        
        logger.info(f"Synced {policies_synced} policies")
        return policies_synced
        
    except Exception as e:
        logger.error(f"Failed to sync policies: {str(e)}")
        raise


@tracer.capture_method
def update_account_status(account_id: str, status: str, sync_counts: Dict):
    """
    Update account sync status and counts
    """
    now = int(datetime.utcnow().timestamp())
    
    accounts_table.update_item(
        Key={'accountId': account_id},
        UpdateExpression='SET #status = :status, lastSyncedAt = :timestamp, syncStatus = :counts',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': status,
            ':timestamp': now,
            ':counts': sync_counts
        }
    )


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: Dict, context: LambdaContext) -> Dict:
    """
    Lambda handler for syncing IAM data from customer AWS account
    
    Event can be:
    1. Scheduled EventBridge event (sync all connected accounts)
    2. Direct invocation with accountId (sync specific account)
    """
    logger.info("AWS Sync Handler started", extra={"event": event})
    
    try:
        # Check if specific account or sync all
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
        
        logger.info(f"Syncing {len(account_ids)} account(s)")
        
        results = []
        
        for account_id in account_ids:
            try:
                # Get account details
                account = accounts_table.get_item(Key={'accountId': account_id})['Item']
                role_arn = account['roleArn']
                external_id = account['externalId']
                
                logger.info(f"Syncing account: {account.get('accountName', account_id)}")
                
                # Assume role
                iam_client = assume_role(role_arn, external_id)
                
                # Sync roles and policies
                roles_count = sync_roles(iam_client, account_id)
                policies_count = sync_policies(iam_client, account_id)
                
                # Update account status
                update_account_status(
                    account_id,
                    'connected',
                    {
                        'rolesCount': roles_count,
                        'policiesCount': policies_count,
                        'findingsCount': 0  # Will be updated by findings-generator
                    }
                )
                
                results.append({
                    'accountId': account_id,
                    'status': 'success',
                    'rolesCount': roles_count,
                    'policiesCount': policies_count
                })
                
            except Exception as e:
                logger.error(f"Failed to sync account {account_id}: {str(e)}")
                
                # Update account status to error
                update_account_status(
                    account_id,
                    'error',
                    {'error': str(e)}
                )
                
                results.append({
                    'accountId': account_id,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Synced {len(results)} account(s)',
                'results': results
            })
        }
        
    except Exception as e:
        logger.error(f"Sync handler failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
