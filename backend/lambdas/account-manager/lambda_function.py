"""
Account Manager - IAM Copilot
Manage AWS account connections (connect, test, disconnect)
"""
import json
import os
import uuid
import boto3
import secrets
from datetime import datetime
from typing import Dict
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

sts = boto3.client('sts')
dynamodb = boto3.resource('dynamodb')

ACCOUNTS_TABLE = os.environ['ACCOUNTS_TABLE_NAME']
IAM_COPILOT_ACCOUNT_ID = os.environ.get('IAM_COPILOT_ACCOUNT_ID', '123456789012')

accounts_table = dynamodb.Table(ACCOUNTS_TABLE)


CLOUDFORMATION_TEMPLATE = """
AWSTemplateFormatVersion: '2010-09-09'
Description: IAM Copilot Read-Only Role for IAM Analysis

Parameters:
  ExternalId:
    Type: String
    Description: External ID for secure AssumeRole
    NoEcho: true
    
  IAMCopilotAccountId:
    Type: String
    Description: IAM Copilot AWS Account ID
    Default: '{account_id}'

Resources:
  IAMCopilotReadRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: IAMCopilotReadRole
      Description: Read-only role for IAM Copilot to analyze IAM configuration
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${{IAMCopilotAccountId}}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref ExternalId
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/SecurityAudit'
        - 'arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess'
      Tags:
        - Key: ManagedBy
          Value: IAMCopilot
        - Key: Purpose
          Value: SecurityAnalysis

Outputs:
  RoleArn:
    Description: ARN of the IAMCopilotReadRole
    Value: !GetAtt IAMCopilotReadRole.Arn
    Export:
      Name: IAMCopilotReadRoleArn
      
  ExternalId:
    Description: External ID used for this role
    Value: !Ref ExternalId
"""


@tracer.capture_method
def generate_external_id() -> str:
    """
    Generate cryptographically secure external ID
    """
    return secrets.token_urlsafe(32)


@tracer.capture_method
def test_assume_role(role_arn: str, external_id: str) -> Dict:
    """
    Test if we can assume the role with the provided external ID
    """
    try:
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName='IAMCopilot-Test',
            ExternalId=external_id,
            DurationSeconds=900  # 15 minutes for test
        )
        
        # Try to list roles to verify permissions
        credentials = response['Credentials']
        iam_client = boto3.client(
            'iam',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        
        # Test basic IAM read access
        iam_client.list_roles(MaxItems=1)
        
        return {
            'success': True,
            'message': 'Successfully assumed role and verified IAM read access'
        }
        
    except Exception as e:
        logger.error(f"Failed to assume role: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@tracer.capture_method
def handle_connect_account(event_body: Dict, user_id: str, org_id: str) -> Dict:
    """
    Handle POST /accounts/connect
    Generate ExternalId and return CloudFormation template
    """
    account_name = event_body.get('accountName')
    aws_account_id = event_body.get('awsAccountId')
    region = event_body.get('region', 'us-east-1')
    
    if not account_name or not aws_account_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'accountName and awsAccountId are required'})
        }
    
    # Validate AWS Account ID format
    if not aws_account_id.isdigit() or len(aws_account_id) != 12:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid AWS Account ID format'})
        }
    
    # Check if account already connected
    existing = accounts_table.query(
        IndexName='awsAccountId-index',
        KeyConditionExpression='awsAccountId = :awsAccountId',
        ExpressionAttributeValues={':awsAccountId': aws_account_id}
    )
    
    if existing.get('Items'):
        return {
            'statusCode': 409,
            'body': json.dumps({'error': 'Account already connected'})
        }
    
    # Generate unique IDs
    account_id = str(uuid.uuid4())
    external_id = generate_external_id()
    role_arn = f"arn:aws:iam::{aws_account_id}:role/IAMCopilotReadRole"
    
    # Create account record
    now = int(datetime.utcnow().timestamp())
    
    accounts_table.put_item(
        Item={
            'accountId': account_id,
            'orgId': org_id,
            'awsAccountId': aws_account_id,
            'accountName': account_name,
            'roleArn': role_arn,
            'externalId': external_id,
            'status': 'pending',  # Will be 'connected' after test succeeds
            'region': region,
            'syncStatus': {
                'rolesCount': 0,
                'policiesCount': 0,
                'findingsCount': 0
            },
            'createdAt': now,
            'createdBy': user_id
        }
    )
    
    # Generate CloudFormation template
    cfn_template = CLOUDFORMATION_TEMPLATE.format(account_id=IAM_COPILOT_ACCOUNT_ID)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'accountId': account_id,
            'externalId': external_id,
            'roleArn': role_arn,
            'cloudFormationTemplate': cfn_template,
            'instructions': {
                'step1': 'Copy the CloudFormation template below',
                'step2': f'Deploy it in your AWS account ({aws_account_id})',
                'step3': 'Use the External ID provided when deploying the stack',
                'step4': 'Click "Test Connection" to verify the setup'
            }
        })
    }


@tracer.capture_method
def handle_test_connection(account_id: str) -> Dict:
    """
    Handle POST /accounts/{accountId}/test
    Test AssumeRole connection
    """
    # Get account
    account_response = accounts_table.get_item(Key={'accountId': account_id})
    
    if 'Item' not in account_response:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Account not found'})
        }
    
    account = account_response['Item']
    role_arn = account['roleArn']
    external_id = account['externalId']
    
    # Test assume role
    result = test_assume_role(role_arn, external_id)
    
    if result['success']:
        # Update account status to connected
        accounts_table.update_item(
            Key={'accountId': account_id},
            UpdateExpression='SET #status = :status, lastSyncedAt = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'connected',
                ':timestamp': int(datetime.utcnow().timestamp())
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': 'Connection successful! Account is ready to sync.',
                'nextSteps': [
                    'Sync will automatically run every hour',
                    'You can manually trigger a sync from the Accounts page',
                    'Check the Dashboard for analysis results'
                ]
            })
        }
    else:
        # Update account status to error
        accounts_table.update_item(
            Key={'accountId': account_id},
            UpdateExpression='SET #status = :status, syncStatus.#error = :error',
            ExpressionAttributeNames={'#status': 'status', '#error': 'error'},
            ExpressionAttributeValues={
                ':status': 'error',
                ':error': result['error']
            }
        )
        
        return {
            'statusCode': 400,
            'body': json.dumps({
                'success': False,
                'error': result['error'],
                'troubleshooting': [
                    'Verify the CloudFormation stack was deployed successfully',
                    'Check that the External ID matches exactly',
                    'Ensure the role trust policy allows IAM Copilot account',
                    'Verify SecurityAudit policy is attached to the role'
                ]
            })
        }


@tracer.capture_method
def handle_disconnect_account(account_id: str) -> Dict:
    """
    Handle DELETE /accounts/{accountId}
    Disconnect account (mark as disconnected, don't delete data)
    """
    # Update status to disconnected
    try:
        accounts_table.update_item(
            Key={'accountId': account_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'disconnected'}
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Account disconnected. Historical data preserved.',
                'note': 'Delete the IAMCopilotReadRole CloudFormation stack in your AWS account'
            })
        }
    except Exception as e:
        logger.error(f"Failed to disconnect account: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


@tracer.capture_method
def handle_list_accounts(org_id: str) -> Dict:
    """
    Handle GET /accounts
    List all accounts for organization
    """
    response = accounts_table.query(
        IndexName='orgId-index',
        KeyConditionExpression='orgId = :orgId',
        ExpressionAttributeValues={':orgId': org_id}
    )
    
    accounts = response.get('Items', [])
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'accounts': accounts,
            'count': len(accounts)
        })
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: Dict, context: LambdaContext) -> Dict:
    """
    Account Manager Lambda Handler
    
    Routes:
    - POST /accounts/connect - Connect new AWS account
    - POST /accounts/{id}/test - Test connection
    - DELETE /accounts/{id} - Disconnect account
    - GET /accounts - List accounts
    """
    logger.info("Account Manager started", extra={"event": event})
    
    try:
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        
        # Get user context from Cognito authorizer
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('claims', {})
        user_id = claims.get('sub')
        org_id = claims.get('custom:orgId')  # Assuming orgId is in Cognito custom attributes
        
        if not user_id or not org_id:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Route handling
        if http_method == 'POST' and path.endswith('/connect'):
            body = json.loads(event.get('body', '{}'))
            return handle_connect_account(body, user_id, org_id)
        
        elif http_method == 'POST' and '/test' in path:
            # Extract accountId from path
            account_id = path.split('/')[-2]
            return handle_test_connection(account_id)
        
        elif http_method == 'DELETE':
            account_id = path.split('/')[-1]
            return handle_disconnect_account(account_id)
        
        elif http_method == 'GET':
            return handle_list_accounts(org_id)
        
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Not found'})
            }
        
    except Exception as e:
        logger.error(f"Account manager failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
