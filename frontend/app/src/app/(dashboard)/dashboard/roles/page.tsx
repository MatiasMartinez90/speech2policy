'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Shield, AlertTriangle, CheckCircle, Search, Filter, Eye, Bot, FileText } from 'lucide-react'

// Mock data
const mockRoles = [
  {
    roleId: 'role-1',
    roleName: 'AdminRole',
    roleArn: 'arn:aws:iam::123456789012:role/AdminRole',
    accountId: 'acc-1',
    accountName: 'Production',
    path: '/',
    riskScore: 95,
    riskLevel: 'CRITICAL',
    riskFactors: ['wildcard-all-actions', 'admin-action-iam', 'privilege-escalation-passrole'],
    attachedPolicies: [
      {
        policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
        policyName: 'AdministratorAccess'
      }
    ],
    inlinePolicies: [],
    trustPolicy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    },
    lastAccessedAt: Date.now() - 86400000
  },
  {
    roleId: 'role-2',
    roleName: 'S3ReadOnlyRole',
    roleArn: 'arn:aws:iam::123456789012:role/S3ReadOnlyRole',
    accountId: 'acc-1',
    accountName: 'Production',
    path: '/',
    riskScore: 15,
    riskLevel: 'LOW',
    riskFactors: [],
    attachedPolicies: [
      {
        policyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
        policyName: 'AmazonS3ReadOnlyAccess'
      }
    ],
    inlinePolicies: [],
    trustPolicy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    },
    lastAccessedAt: Date.now() - 3600000
  },
  {
    roleId: 'role-3',
    roleName: 'LambdaExecutionRole',
    roleArn: 'arn:aws:iam::123456789012:role/LambdaExecutionRole',
    accountId: 'acc-1',
    accountName: 'Production',
    path: '/service-role/',
    riskScore: 45,
    riskLevel: 'MEDIUM',
    riskFactors: ['wildcard-resources'],
    attachedPolicies: [
      {
        policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        policyName: 'AWSLambdaBasicExecutionRole'
      }
    ],
    inlinePolicies: [{
      policyName: 'DynamoDBAccess',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: ['dynamodb:*'],
          Resource: '*'
        }]
      }
    }],
    trustPolicy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    },
    lastAccessedAt: Date.now() - 7200000
  },
  {
    roleId: 'role-4',
    roleName: 'PowerUserRole',
    roleArn: 'arn:aws:iam::234567890123:role/PowerUserRole',
    accountId: 'acc-2',
    accountName: 'Staging',
    path: '/',
    riskScore: 72,
    riskLevel: 'HIGH',
    riskFactors: ['wildcard-resources', 'dangerous-permission-s3-deletebucket'],
    attachedPolicies: [
      {
        policyArn: 'arn:aws:iam::aws:policy/PowerUserAccess',
        policyName: 'PowerUserAccess'
      }
    ],
    inlinePolicies: [],
    trustPolicy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::234567890123:root' },
        Action: 'sts:AssumeRole'
      }]
    },
    lastAccessedAt: Date.now() - 14400000
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

export default function RolesPage() {
  const [roles, setRoles] = useState(mockRoles)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRiskLevel, setFilterRiskLevel] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<typeof mockRoles[0] | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         role.accountName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = !filterRiskLevel || role.riskLevel === filterRiskLevel
    return matchesSearch && matchesFilter
  })

  const handleViewDetails = (role: typeof mockRoles[0]) => {
    setSelectedRole(role)
    setIsDetailDialogOpen(true)
  }

  const riskLevelCounts = {
    CRITICAL: roles.filter(r => r.riskLevel === 'CRITICAL').length,
    HIGH: roles.filter(r => r.riskLevel === 'HIGH').length,
    MEDIUM: roles.filter(r => r.riskLevel === 'MEDIUM').length,
    LOW: roles.filter(r => r.riskLevel === 'LOW').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IAM Roles</h1>
        <p className="text-muted-foreground mt-2">
          Inventory and risk analysis of IAM roles across all accounts
        </p>
      </div>

      {/* Risk Level Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.CRITICAL}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.HIGH}</div>
            <p className="text-xs text-muted-foreground">
              Should be reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.MEDIUM}</div>
            <p className="text-xs text-muted-foreground">
              Monitor for changes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskLevelCounts.LOW}</div>
            <p className="text-xs text-muted-foreground">
              Well-configured roles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Roles</CardTitle>
              <CardDescription>
                {filteredRoles.length} of {roles.length} roles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  className="pl-9 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant={filterRiskLevel ? 'default' : 'outline'}
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
                <TableHead>Role Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Factors</TableHead>
                <TableHead>Attached Policies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.roleId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getRiskColor(role.riskLevel)}`} />
                      {role.roleName}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{role.accountName}</TableCell>
                  <TableCell className="text-sm font-mono">{role.path}</TableCell>
                  <TableCell>{getRiskBadge(role.riskLevel, role.riskScore)}</TableCell>
                  <TableCell>
                    {role.riskFactors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {role.riskFactors.slice(0, 2).map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                        {role.riskFactors.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.riskFactors.length - 2} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {role.attachedPolicies.length} attached
                    {role.inlinePolicies.length > 0 && `, ${role.inlinePolicies.length} inline`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(role)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={role.riskScore < 50}
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

      {/* Role Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRole && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {selectedRole.roleName}
                </DialogTitle>
                <DialogDescription>
                  {selectedRole.roleArn}
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
                          <div className="text-3xl font-bold">{selectedRole.riskScore}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getRiskColor(selectedRole.riskLevel)}`}
                                style={{ width: `${selectedRole.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Risk Factors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedRole.riskFactors.length > 0 ? (
                          <div className="space-y-1">
                            {selectedRole.riskFactors.map((factor, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-3 w-3 text-orange-500" />
                                <span>{factor.replace(/-/g, ' ')}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No risk factors detected</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Trust Policy */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Trust Policy (AssumeRolePolicyDocument)</h3>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedRole.trustPolicy, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Attached Policies */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Attached Policies</h3>
                  {selectedRole.attachedPolicies.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRole.attachedPolicies.map((policy, i) => (
                        <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{policy.policyName}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {policy.policyArn}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attached policies</p>
                  )}
                </div>

                {/* Inline Policies */}
                {selectedRole.inlinePolicies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Inline Policies</h3>
                    <div className="space-y-2">
                      {selectedRole.inlinePolicies.map((policy, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">{policy.policyName}</div>
                          <div className="rounded-lg border bg-muted p-3">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(policy.policyDocument, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button className="gap-2">
                    <Bot className="h-4 w-4" />
                    Fix with AI Builder
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Create Finding
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
