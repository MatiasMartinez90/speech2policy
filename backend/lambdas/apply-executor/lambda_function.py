"""
Apply Executor - IAM Copilot
Safely execute IAM changes with validation and rollback
"""
import json
import os
import boto3
import time
from datetime import datetime
from typing import Dict, Optional
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

sts = boto3.client('sts')
cfn = boto3.client('cloudformation')
dynamodb = boto3.resource('dynamodb')

APPLY_REQUESTS_TABLE = os.environ['APPLY_REQUESTS_TABLE_NAME']
ACCOUNTS_TABLE = os.environ['ACCOUNTS_TABLE_NAME']
AUDIT_LOG_TABLE = os.environ['AUDIT_LOG_TABLE_NAME']

apply_requests_table = dynamodb.Table(APPLY_REQUESTS_TABLE)
accounts_table = dynamodb.Table(ACCOUNTS_TABLE)
audit_log_table = dynamodb.Table(AUDIT_LOG_TABLE)


@tracer.capture_method
def generate_cloudformation_template(request: Dict) -> str:
    """
    Generate CloudFormation template for the IAM change
    """
    change_type = request['changeType']
    resource_type = request['resourceType']
    change_set = request['changeSet']
    
    template = {
        'AWSTemplateFormatVersion': '2010-09-09',
        'Description': f'IAM Copilot: {request["title"]}',
        'Resources': {}
    }
    
    if change_type == 'update' and resource_type == 'policy':
        # Update existing policy
        policy_name = request.get('resourceId', 'UpdatedPolicy')
        template['Resources']['IAMPolicy'] = {
            'Type': 'AWS::IAM::Policy',
            'Properties': {
                'PolicyName': policy_name,
                'PolicyDocument': change_set['after'],
                'Roles': request.get('attachedRoles', [])
            }
        }
    
    elif change_type == 'create' and resource_type == 'policy':
        # Create new policy
        template['Resources']['NewIAMPolicy'] = {
            'Type': 'AWS::IAM::ManagedPolicy',
            'Properties': {
                'PolicyDocument': change_set['after'],
                'Description': request.get('description', 'Created by IAM Copilot')
            }
        }
    
    elif change_type == 'update' and resource_type == 'role':
        # Update role's inline policy
        role_name = request.get('resourceId', 'UpdatedRole')
        template['Resources']['IAMRole'] = {
            'Type': 'AWS::IAM::Role',
            'Properties': {
                'RoleName': role_name,
                'AssumeRolePolicyDocument': change_set.get('trustPolicy', change_set['before'].get('trustPolicy')),
                'Policies': [{
                    'PolicyName': 'InlinePolicy',
                    'PolicyDocument': change_set['after']
                }]
            }
        }
    
    return json.dumps(template, indent=2)


@tracer.capture_method
def create_cloudformation_changeset(template: str, stack_name: str, iam_client: boto3.client) -> str:
    """
    Create CloudFormation ChangeSet
    Returns: changeset_id
    """
    try:
        # Check if stack exists
        try:
            cfn.describe_stacks(StackName=stack_name)
            stack_exists = True
        except:
            stack_exists = False
        
        changeset_name = f'iam-copilot-{int(time.time())}'
        
        if stack_exists:
            response = cfn.create_change_set(
                StackName=stack_name,
                TemplateBody=template,
                ChangeSetName=changeset_name,
                ChangeSetType='UPDATE',
                Capabilities=['CAPABILITY_NAMED_IAM']
            )
        else:
            response = cfn.create_change_set(
                StackName=stack_name,
                TemplateBody=template,
                ChangeSetName=changeset_name,
                ChangeSetType='CREATE',
                Capabilities=['CAPABILITY_NAMED_IAM']
            )
        
        changeset_id = response['Id']
        
        # Wait for changeset creation
        waiter = cfn.get_waiter('change_set_create_complete')
        waiter.wait(
            ChangeSetName=changeset_id,
            WaiterConfig={'Delay': 2, 'MaxAttempts': 30}
        )
        
        return changeset_id
        
    except Exception as e:
        logger.error(f"Failed to create changeset: {str(e)}")
        raise


@tracer.capture_method
def execute_changeset(changeset_id: str, request_id: str) -> Dict:
    """
    Execute CloudFormation ChangeSet
    """
    try:
        # Execute the changeset
        cfn.execute_change_set(ChangeSetName=changeset_id)
        
        # Wait for stack update
        stack_name = changeset_id.split('/')[1]
        waiter = cfn.get_waiter('stack_update_complete')
        
        try:
            waiter.wait(
                StackName=stack_name,
                WaiterConfig={'Delay': 5, 'MaxAttempts': 60}
            )
            
            return {
                'success': True,
                'stackId': stack_name,
                'message': 'Changes applied successfully'
            }
            
        except Exception as wait_error:
            # Stack update failed, check for rollback
            stack = cfn.describe_stacks(StackName=stack_name)['Stacks'][0]
            status = stack['StackStatus']
            
            if 'ROLLBACK' in status:
                logger.warning(f"Stack rolled back: {status}")
                return {
                    'success': False,
                    'error': 'Stack update failed and was rolled back',
                    'stackStatus': status
                }
            else:
                raise wait_error
        
    except Exception as e:
        logger.error(f"Failed to execute changeset: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@tracer.capture_method
def log_to_audit(request: Dict, action: str, success: bool, details: Dict, user_id: str):
    """
    Write to immutable audit log
    """
    log_id = f"{request['requestId']}_{action}_{int(time.time())}"
    
    audit_log_table.put_item(
        Item={
            'logId': log_id,
            'orgId': request['orgId'],
            'timestamp': int(datetime.utcnow().timestamp()),
            'userId': user_id,
            'action': action,
            'resourceType': request['resourceType'],
            'resourceId': request.get('resourceId', 'N/A'),
            'details': details,
            'success': success,
            'changeSet': request.get('changeSet'),
            'ttl': int((datetime.utcnow().timestamp()) + (365 * 24 * 60 * 60 * 7))  # 7 years
        }
    )


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: Dict, context: LambdaContext) -> Dict:
    """
    Apply Executor Lambda Handler
    
    Executes approved IAM changes via CloudFormation
    """
    logger.info("Apply Executor started", extra={"event": event})
    
    try:
        request_id = event.get('requestId')
        user_id = event.get('userId')
        
        if not request_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'requestId is required'})
            }
        
        # Get apply request
        request_response = apply_requests_table.get_item(Key={'requestId': request_id})
        
        if 'Item' not in request_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Request not found'})
            }
        
        request = request_response['Item']
        
        # Check if approved
        if request['status'] != 'approved':
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Request is {request["status"]}, not approved'})
            }
        
        # Get account details
        account = accounts_table.get_item(Key={'accountId': request['accountId']})['Item']
        
        # Assume role in customer account (with WRITE permissions)
        # NOTE: This requires a separate role with write permissions
        # For MVP, we'll generate CloudFormation template for manual execution
        
        # Generate CloudFormation template
        cfn_template = generate_cloudformation_template(request)
        
        # For now, return template for manual execution
        # In production, this would:
        # 1. Assume role with write permissions
        # 2. Create and execute CloudFormation ChangeSet
        # 3. Monitor execution
        # 4. Rollback if fails
        
        # Update request status
        now = int(datetime.utcnow().timestamp())
        
        apply_requests_table.update_item(
            Key={'requestId': request_id},
            UpdateExpression='SET #status = :status, executionDetails = :details',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'executed',
                ':details': {
                    'executedAt': now,
                    'executedBy': user_id,
                    'cloudFormationTemplate': cfn_template,
                    'executionMethod': 'manual'
                }
            }
        )
        
        # Log to audit
        log_to_audit(
            request,
            'apply_change',
            True,
            {'cloudFormationTemplate': cfn_template},
            user_id
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'CloudFormation template generated',
                'cloudFormationTemplate': cfn_template,
                'instructions': [
                    '1. Copy the CloudFormation template below',
                    '2. Deploy it in your AWS account via CloudFormation console or CLI',
                    '3. The stack will create/update the IAM resources safely',
                    '4. CloudFormation will automatically rollback if there are errors'
                ],
                'cliCommand': f'aws cloudformation deploy --template-file template.yaml --stack-name iam-copilot-{request_id[:8]} --capabilities CAPABILITY_NAMED_IAM'
            })
        }
        
    except Exception as e:
        logger.error(f"Apply executor failed: {str(e)}")
        
        # Log failure to audit
        if 'request' in locals():
            log_to_audit(
                request,
                'apply_change',
                False,
                {'error': str(e)},
                user_id or 'system'
            )
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
