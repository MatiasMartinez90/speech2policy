'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cloud, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink, Plus } from 'lucide-react'

// Mock data
const mockAccounts = [
  {
    accountId: 'acc-1',
    accountName: 'Production',
    awsAccountId: '123456789012',
    status: 'connected',
    lastSyncedAt: Date.now() - 3600000, // 1 hour ago
    syncStatus: {
      rolesCount: 127,
      policiesCount: 89,
      findingsCount: 23
    },
    region: 'us-east-1'
  },
  {
    accountId: 'acc-2',
    accountName: 'Staging',
    awsAccountId: '234567890123',
    status: 'connected',
    lastSyncedAt: Date.now() - 7200000, // 2 hours ago
    syncStatus: {
      rolesCount: 45,
      policiesCount: 32,
      findingsCount: 8
    },
    region: 'us-west-2'
  },
  {
    accountId: 'acc-3',
    accountName: 'Development',
    awsAccountId: '345678901234',
    status: 'error',
    lastSyncedAt: Date.now() - 86400000, // 1 day ago
    syncStatus: {
      rolesCount: 0,
      policiesCount: 0,
      findingsCount: 0
    },
    region: 'us-east-1'
  }
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Connected</Badge>
    case 'disconnected':
      return <Badge variant="default" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Disconnected</Badge>
    case 'error':
      return <Badge variant="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)
  const [connectStep, setConnectStep] = useState(1) // 1: Form, 2: CloudFormation, 3: Complete
  const [newAccount, setNewAccount] = useState({
    accountName: '',
    awsAccountId: '',
    region: 'us-east-1'
  })
  const [generatedData, setGeneratedData] = useState({
    externalId: '',
    cloudFormationTemplate: '',
    roleArn: ''
  })

  const handleConnectSubmit = () => {
    // Simulate API call to generate ExternalId and CloudFormation template
    const externalId = `iam-copilot-${Math.random().toString(36).substring(7)}`
    const cloudFormationTemplate = generateCloudFormationTemplate(externalId)

    setGeneratedData({
      externalId,
      cloudFormationTemplate,
      roleArn: `arn:aws:iam::${newAccount.awsAccountId}:role/IAMCopilotReadRole`
    })

    setConnectStep(2)
  }

  const handleCompleteConnection = () => {
    // Simulate account connection
    const newAcc = {
      accountId: `acc-${accounts.length + 1}`,
      accountName: newAccount.accountName,
      awsAccountId: newAccount.awsAccountId,
      status: 'connected',
      lastSyncedAt: Date.now(),
      syncStatus: {
        rolesCount: 0,
        policiesCount: 0,
        findingsCount: 0
      },
      region: newAccount.region
    }

    setAccounts([...accounts, newAcc])
    setIsConnectDialogOpen(false)
    setConnectStep(1)
    setNewAccount({ accountName: '', awsAccountId: '', region: 'us-east-1' })
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // In production, show toast notification
  }

  const handleSyncAccount = (accountId: string) => {
    // Simulate sync trigger
    setAccounts(accounts.map(acc =>
      acc.accountId === accountId
        ? { ...acc, lastSyncedAt: Date.now() }
        : acc
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AWS Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Connect and manage your AWS accounts for IAM analysis
          </p>
        </div>

        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect AWS Account</DialogTitle>
              <DialogDescription>
                {connectStep === 1 && "Enter your AWS account details to get started"}
                {connectStep === 2 && "Deploy this CloudFormation stack in your AWS account"}
                {connectStep === 3 && "Connection successful!"}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Account Details */}
            {connectStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Production"
                    value={newAccount.accountName}
                    onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Friendly name for this account</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="awsAccountId">AWS Account ID</Label>
                  <Input
                    id="awsAccountId"
                    placeholder="123456789012"
                    value={newAccount.awsAccountId}
                    onChange={(e) => setNewAccount({ ...newAccount, awsAccountId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">12-digit AWS account ID</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Primary Region</Label>
                  <Input
                    id="region"
                    placeholder="us-east-1"
                    value={newAccount.region}
                    onChange={(e) => setNewAccount({ ...newAccount, region: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">AWS region for this account</p>
                </div>
              </div>
            )}

            {/* Step 2: CloudFormation Deployment */}
            {connectStep === 2 && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg border bg-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">External ID</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyToClipboard(generatedData.externalId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <code className="block text-xs bg-background p-2 rounded">
                    {generatedData.externalId}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label>CloudFormation Template</Label>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-xs overflow-x-auto max-h-60">
                      {generatedData.cloudFormationTemplate}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(generatedData.cloudFormationTemplate)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`https://console.aws.amazon.com/cloudformation/home?region=${newAccount.region}#/stacks/create/review`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open AWS Console
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950 dark:border-blue-800">
                  <h4 className="font-medium text-sm mb-2">Next Steps:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Copy the CloudFormation template above</li>
                    <li>Open AWS CloudFormation console in your account</li>
                    <li>Create a new stack using the template</li>
                    <li>Use the External ID shown above as parameter</li>
                    <li>Click "Complete Connection" below when done</li>
                  </ol>
                </div>
              </div>
            )}

            <DialogFooter>
              {connectStep === 1 && (
                <>
                  <Button variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConnectSubmit}
                    disabled={!newAccount.accountName || !newAccount.awsAccountId}
                  >
                    Generate Template
                  </Button>
                </>
              )}

              {connectStep === 2 && (
                <>
                  <Button variant="outline" onClick={() => setConnectStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleCompleteConnection}>
                    Complete Connection
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter(a => a.status === 'connected').length} connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.reduce((sum, acc) => sum + acc.syncStatus.rolesCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.reduce((sum, acc) => sum + acc.syncStatus.findingsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Security issues detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            View and manage your connected AWS accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>AWS Account ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.accountId}>
                  <TableCell className="font-medium">{account.accountName}</TableCell>
                  <TableCell className="font-mono text-sm">{account.awsAccountId}</TableCell>
                  <TableCell>{getStatusBadge(account.status)}</TableCell>
                  <TableCell>{account.region}</TableCell>
                  <TableCell>{account.syncStatus.rolesCount}</TableCell>
                  <TableCell>{account.syncStatus.policiesCount}</TableCell>
                  <TableCell>
                    {account.syncStatus.findingsCount > 0 ? (
                      <Badge variant="warning">{account.syncStatus.findingsCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimeAgo(account.lastSyncedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSyncAccount(account.accountId)}
                      disabled={account.status === 'error'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function generateCloudFormationTemplate(externalId: string): string {
  return `AWSTemplateFormatVersion: '2010-09-09'
Description: IAM Copilot Read Role - Allows IAM Copilot to analyze your IAM configuration

Parameters:
  ExternalId:
    Type: String
    Description: External ID for secure AssumeRole
    Default: ${externalId}

  IAMCopilotAccountId:
    Type: String
    Description: IAM Copilot AWS Account ID
    Default: 123456789012

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
              AWS: !Sub 'arn:aws:iam::\${IAMCopilotAccountId}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref ExternalId
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/SecurityAudit'
        - 'arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess'
      Tags:
        - Key: Name
          Value: IAMCopilotReadRole
        - Key: ManagedBy
          Value: IAMCopilot

Outputs:
  RoleArn:
    Description: ARN of the IAMCopilotReadRole
    Value: !GetAtt IAMCopilotReadRole.Arn
    Export:
      Name: IAMCopilotReadRoleArn`
}
