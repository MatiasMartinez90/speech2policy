'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FileText, AlertTriangle, CheckCircle, Search, Filter, Eye, Bot, Copy } from 'lucide-react'

// Mock data
const mockPolicies = [
  {
    policyId: 'pol-1',
    policyName: 'FullAdminPolicy',
    policyArn: 'arn:aws:iam::123456789012:policy/FullAdminPolicy',
    policyType: 'Managed',
    accountId: 'acc-1',
    accountName: 'Production',
    riskScore: 100,
    riskLevel: 'CRITICAL',
    wildcards: {
      actions: true,
      resources: true
    },
    dangerousPermissions: ['iam:*', 's3:*', 'ec2:*', 'dynamodb:*'],
    attachedToRoles: ['AdminRole', 'SuperUserRole'],
    attachedToUsers: [],
    attachedToGroups: [],
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*'
      }]
    },
    version: 'v5',
    lastSynced: Date.now() - 3600000
  },
  {
    policyId: 'pol-2',
    policyName: 'S3ReadOnlyPolicy',
    policyArn: 'arn:aws:iam::123456789012:policy/S3ReadOnlyPolicy',
    policyType: 'Managed',
    accountId: 'acc-1',
    accountName: 'Production',
    riskScore: 10,
    riskLevel: 'LOW',
    wildcards: {
      actions: false,
      resources: false
    },
    dangerousPermissions: [],
    attachedToRoles: ['AppRole', 'DataPipelineRole'],
    attachedToUsers: ['john.doe'],
    attachedToGroups: ['Developers'],
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:ListBucket'
        ],
        Resource: [
          'arn:aws:s3:::my-bucket',
          'arn:aws:s3:::my-bucket/*'
        ]
      }]
    },
    version: 'v1',
    lastSynced: Date.now() - 7200000
  },
  {
    policyId: 'pol-3',
    policyName: 'DynamoDBWildcardPolicy',
    policyArn: 'arn:aws:iam::123456789012:policy/DynamoDBWildcardPolicy',
    policyType: 'Managed',
    accountId: 'acc-1',
    accountName: 'Production',
    riskScore: 65,
    riskLevel: 'HIGH',
    wildcards: {
      actions: true,
      resources: true
    },
    dangerousPermissions: ['dynamodb:*'],
    attachedToRoles: ['LambdaRole', 'ECSTaskRole'],
    attachedToUsers: [],
    attachedToGroups: [],
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'dynamodb:*',
        Resource: '*'
      }]
    },
    version: 'v2',
    lastSynced: Date.now() - 1800000
  },
  {
    policyId: 'pol-4',
    policyName: 'EC2InstancePolicy',
    policyArn: 'arn:aws:iam::234567890123:policy/EC2InstancePolicy',
    policyType: 'Managed',
    accountId: 'acc-2',
    accountName: 'Staging',
    riskScore: 38,
    riskLevel: 'MEDIUM',
    wildcards: {
      actions: false,
      resources: true
    },
    dangerousPermissions: ['ec2:RunInstances'],
    attachedToRoles: ['EC2Role'],
    attachedToUsers: [],
    attachedToGroups: [],
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          'ec2:RunInstances',
          'ec2:TerminateInstances',
          'ec2:DescribeInstances'
        ],
        Resource: '*'
      }]
    },
    version: 'v3',
    lastSynced: Date.now() - 5400000
  }
]

function getRiskBadge(riskLevel: string, riskScore: number) {
  switch (riskLevel) {
    case 'CRITICAL':
      return <Badge variant="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> CRITICAL ({riskScore})</Badge>
    case 'HIGH':
      return <Badge variant="danger" className="flex items-center gap-1">HIGH ({riskScore})</Badge>
    case 'MEDIUM':
      return <Badge variant="warning" className="flex items-center gap-1">MEDIUM ({riskScore})</Badge>
    case 'LOW':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> LOW ({riskScore})</Badge>
    default:
      return <Badge>{riskLevel} ({riskScore})</Badge>
  }
}

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case 'CRITICAL': return 'bg-red-500'
    case 'HIGH': return 'bg-orange-500'
    case 'MEDIUM': return 'bg-yellow-500'
    case 'LOW': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState(mockPolicies)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPolicyType, setFilterPolicyType] = useState<string | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<typeof mockPolicies[0] | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.policyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         policy.accountName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = !filterPolicyType || policy.policyType === filterPolicyType
    return matchesSearch && matchesFilter
  })

  const handleViewDetails = (policy: typeof mockPolicies[0]) => {
    setSelectedPolicy(policy)
    setIsDetailDialogOpen(true)
  }

  const handleCopyPolicy = (policyDocument: any) => {
    navigator.clipboard.writeText(JSON.stringify(policyDocument, null, 2))
  }

  const riskLevelCounts = {
    CRITICAL: policies.filter(p => p.riskLevel === 'CRITICAL').length,
    HIGH: policies.filter(p => p.riskLevel === 'HIGH').length,
    MEDIUM: policies.filter(p => p.riskLevel === 'MEDIUM').length,
    LOW: policies.filter(p => p.riskLevel === 'LOW').length
  }

  const wildcardPolicies = policies.filter(p => p.wildcards.actions || p.wildcards.resources).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IAM Policies</h1>
        <p className="text-muted-foreground mt-2">
          Inventory and analysis of IAM policies across all accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.length}</div>
            <p className="text-xs text-muted-foreground">
              Customer-managed policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.CRITICAL}</div>
            <p className="text-xs text-muted-foreground">
              Immediate review needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wildcard Policies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wildcardPolicies}</div>
            <p className="text-xs text-muted-foreground">
              Using * in actions or resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Well-Configured</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.LOW}</div>
            <p className="text-xs text-muted-foreground">
              Following best practices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Policies</CardTitle>
              <CardDescription>
                {filteredPolicies.length} of {policies.length} policies
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  className="pl-9 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant={filterPolicyType ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Wildcards</TableHead>
                <TableHead>Attached To</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map((policy) => (
                <TableRow key={policy.policyId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getRiskColor(policy.riskLevel)}`} />
                      {policy.policyName}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{policy.accountName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{policy.policyType}</Badge>
                  </TableCell>
                  <TableCell>{getRiskBadge(policy.riskLevel, policy.riskScore)}</TableCell>
                  <TableCell>
                    {policy.wildcards.actions || policy.wildcards.resources ? (
                      <div className="flex gap-1">
                        {policy.wildcards.actions && (
                          <Badge variant="warning" className="text-xs">Action:*</Badge>
                        )}
                        {policy.wildcards.resources && (
                          <Badge variant="warning" className="text-xs">Resource:*</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {policy.attachedToRoles.length} roles
                    {policy.attachedToUsers.length > 0 && `, ${policy.attachedToUsers.length} users`}
                    {policy.attachedToGroups.length > 0 && `, ${policy.attachedToGroups.length} groups`}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{policy.version}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(policy)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={policy.riskScore < 50}
                      >
                        <Bot className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Policy Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPolicy && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedPolicy.policyName}
                </DialogTitle>
                <DialogDescription>
                  {selectedPolicy.policyArn}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Risk Overview */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Risk Assessment</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Risk Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold">{selectedPolicy.riskScore}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getRiskColor(selectedPolicy.riskLevel)}`}
                                style={{ width: `${selectedPolicy.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Dangerous Permissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPolicy.dangerousPermissions.length > 0 ? (
                          <div className="space-y-1">
                            {selectedPolicy.dangerousPermissions.map((perm, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-3 w-3 text-orange-500" />
                                <code className="text-xs">{perm}</code>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">None detected</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Policy Document */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Policy Document</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPolicy(selectedPolicy.policyDocument)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedPolicy.policyDocument, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Attached Resources */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Attached To</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Roles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPolicy.attachedToRoles.length > 0 ? (
                          <div className="space-y-1">
                            {selectedPolicy.attachedToRoles.map((role, i) => (
                              <div key={i} className="text-sm">{role}</div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">None</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPolicy.attachedToUsers.length > 0 ? (
                          <div className="space-y-1">
                            {selectedPolicy.attachedToUsers.map((user, i) => (
                              <div key={i} className="text-sm">{user}</div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">None</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Groups</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPolicy.attachedToGroups.length > 0 ? (
                          <div className="space-y-1">
                            {selectedPolicy.attachedToGroups.map((group, i) => (
                              <div key={i} className="text-sm">{group}</div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">None</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button className="gap-2">
                    <Bot className="h-4 w-4" />
                    Optimize with AI
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Duplicate Policy
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
