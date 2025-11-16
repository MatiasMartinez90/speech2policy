'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle, XCircle, Search, Filter, Eye, Bot, Check, X, AlertOctagon, FileText } from 'lucide-react'

// Mock data
const mockFindings = [
  {
    findingId: 'find-1',
    title: 'Administrator Access Detected: AdminRole',
    description: 'This role has the AWS managed AdministratorAccess policy attached, granting full access to all AWS services and resources.',
    severity: 'CRITICAL',
    category: 'least-privilege',
    status: 'open',
    accountId: 'acc-1',
    accountName: 'Production',
    resourceType: 'role',
    resourceId: 'role-1',
    resourceArn: 'arn:aws:iam::123456789012:role/AdminRole',
    recommendation: `1. Review if admin access is truly required
2. Consider using more specific managed policies (e.g., PowerUserAccess, ReadOnlyAccess)
3. If admin access is needed, implement:
   - MFA requirement via condition
   - IP restriction via condition
   - Time-based access (temporary elevation)
4. Enable CloudTrail logging and set up alerts for admin actions`,
    suggestedFix: {
      type: 'replace-policy',
      description: 'Replace with least-privilege alternatives',
      alternatives: [
        'PowerUserAccess (excludes IAM and Organizations)',
        'ReadOnlyAccess (audit and monitoring)',
        'Custom policy with specific permissions'
      ]
    },
    createdAt: Date.now() - 86400000,
    assignedTo: null
  },
  {
    findingId: 'find-2',
    title: 'Privilege Escalation Risk: LambdaExecutionRole',
    description: 'This role has a dangerous combination of permissions that could allow privilege escalation. The combination of iam:PassRole with lambda:CreateFunction allows an attacker to create resources with elevated permissions.',
    severity: 'CRITICAL',
    category: 'privilege-escalation',
    status: 'open',
    accountId: 'acc-1',
    accountName: 'Production',
    resourceType: 'role',
    resourceId: 'role-3',
    resourceArn: 'arn:aws:iam::123456789012:role/LambdaExecutionRole',
    recommendation: `1. Separate PassRole permissions into a dedicated role
2. Add conditions to PassRole to restrict which roles can be passed
3. Consider using service-specific roles instead of broad PassRole permissions`,
    suggestedFix: {
      type: 'restrict-passrole',
      description: 'Add conditions to PassRole action',
      example: {
        Effect: 'Allow',
        Action: 'iam:PassRole',
        Resource: 'arn:aws:iam::*:role/SpecificRoleName',
        Condition: {
          StringEquals: {
            'iam:PassedToService': 'lambda.amazonaws.com'
          }
        }
      }
    },
    createdAt: Date.now() - 172800000,
    assignedTo: 'user-123'
  },
  {
    findingId: 'find-3',
    title: 'Overly Permissive Policy: DynamoDBWildcardPolicy',
    description: 'This policy has overly broad permissions. Contains wildcard actions (Action: dynamodb:*) and Contains wildcard resources (Resource: *). This violates the principle of least privilege.',
    severity: 'HIGH',
    category: 'wildcard',
    status: 'open',
    accountId: 'acc-1',
    accountName: 'Production',
    resourceType: 'policy',
    resourceId: 'pol-3',
    resourceArn: 'arn:aws:iam::123456789012:policy/DynamoDBWildcardPolicy',
    recommendation: 'Restrict the policy to only the specific actions and resources required. Review CloudTrail logs to identify actual usage patterns.',
    suggestedFix: {
      type: 'restrict-permissions',
      description: 'Remove wildcards and specify explicit actions/resources',
      steps: [
        '1. Review CloudTrail logs for actual API calls',
        '2. Identify minimum required permissions',
        '3. Update policy to use explicit actions and resources',
        '4. Test changes in non-production environment',
        '5. Apply changes using IAM Copilot Apply workflow'
      ]
    },
    createdAt: Date.now() - 259200000,
    assignedTo: null
  },
  {
    findingId: 'find-4',
    title: 'High-Risk Role: PowerUserRole',
    description: 'This role has a risk score of 72/100, indicating potential security concerns. Risk factors detected: wildcard-resources, dangerous-permission-s3-deletebucket',
    severity: 'HIGH',
    category: 'least-privilege',
    status: 'accepted-risk',
    accountId: 'acc-2',
    accountName: 'Staging',
    resourceType: 'role',
    resourceId: 'role-4',
    resourceArn: 'arn:aws:iam::234567890123:role/PowerUserRole',
    recommendation: "Review this role's permissions and apply least privilege principle. Use IAM Copilot's AI Builder to generate a safer alternative.",
    suggestedFix: {
      type: 'analyze-with-ai',
      description: 'Use AI Builder to generate optimized policy'
    },
    createdAt: Date.now() - 432000000,
    assignedTo: 'user-456'
  },
  {
    findingId: 'find-5',
    title: 'Wildcard Resources in EC2 Policy',
    description: 'This policy allows EC2 actions on all resources (Resource: *), which could be restricted to specific instance IDs or VPCs.',
    severity: 'MEDIUM',
    category: 'wildcard',
    status: 'resolved',
    accountId: 'acc-2',
    accountName: 'Staging',
    resourceType: 'policy',
    resourceId: 'pol-4',
    resourceArn: 'arn:aws:iam::234567890123:policy/EC2InstancePolicy',
    recommendation: 'Restrict Resource to specific instance ARNs or use conditions to limit scope.',
    suggestedFix: {
      type: 'restrict-resources',
      description: 'Replace Resource: "*" with specific ARNs',
      example: {
        Effect: 'Allow',
        Action: ['ec2:RunInstances', 'ec2:TerminateInstances'],
        Resource: [
          'arn:aws:ec2:us-east-1:123456789012:instance/*',
          'arn:aws:ec2:us-east-1:123456789012:security-group/*'
        ]
      }
    },
    createdAt: Date.now() - 604800000,
    assignedTo: null
  }
]

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return <Badge variant="danger" className="flex items-center gap-1"><AlertOctagon className="h-3 w-3" /> CRITICAL</Badge>
    case 'HIGH':
      return <Badge variant="danger">HIGH</Badge>
    case 'MEDIUM':
      return <Badge variant="warning">MEDIUM</Badge>
    case 'LOW':
      return <Badge variant="default">LOW</Badge>
    default:
      return <Badge>{severity}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return <Badge variant="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Open</Badge>
    case 'resolved':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</Badge>
    case 'accepted-risk':
      return <Badge variant="warning" className="flex items-center gap-1">Accepted Risk</Badge>
    case 'false-positive':
      return <Badge variant="default" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> False Positive</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getCategoryBadge(category: string) {
  const categoryMap: Record<string, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
    'least-privilege': { label: 'Least Privilege', variant: 'default' },
    'wildcard': { label: 'Wildcard', variant: 'warning' },
    'privilege-escalation': { label: 'Privilege Escalation', variant: 'danger' },
    'unused-permissions': { label: 'Unused Permissions', variant: 'default' }
  }
  const config = categoryMap[category] || { label: category, variant: 'default' }
  return <Badge variant={config.variant as any}>{config.label}</Badge>
}

export default function FindingsPage() {
  const [findings, setFindings] = useState(mockFindings)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<typeof mockFindings[0] | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredFindings = findings.filter(finding => {
    const matchesSearch = finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         finding.accountName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || finding.status === filterStatus
    const matchesSeverity = !filterSeverity || finding.severity === filterSeverity
    return matchesSearch && matchesStatus && matchesSeverity
  })

  const handleViewDetails = (finding: typeof mockFindings[0]) => {
    setSelectedFinding(finding)
    setIsDetailDialogOpen(true)
  }

  const handleResolveFinding = (findingId: string) => {
    setFindings(findings.map(f =>
      f.findingId === findingId ? { ...f, status: 'resolved' } : f
    ))
  }

  const handleAcceptRisk = (findingId: string) => {
    setFindings(findings.map(f =>
      f.findingId === findingId ? { ...f, status: 'accepted-risk' } : f
    ))
  }

  const handleMarkFalsePositive = (findingId: string) => {
    setFindings(findings.map(f =>
      f.findingId === findingId ? { ...f, status: 'false-positive' } : f
    ))
  }

  const severityCounts = {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL' && f.status === 'open').length,
    HIGH: findings.filter(f => f.severity === 'HIGH' && f.status === 'open').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM' && f.status === 'open').length,
    total: findings.filter(f => f.status === 'open').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Findings</h1>
        <p className="text-muted-foreground mt-2">
          Automatically detected security issues and remediation recommendations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{severityCounts.total}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Severity</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{severityCounts.CRITICAL}</div>
            <p className="text-xs text-muted-foreground">
              Immediate action required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{severityCounts.HIGH}</div>
            <p className="text-xs text-muted-foreground">
              Should be reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findings.filter(f => f.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Issues fixed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Findings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Findings</CardTitle>
              <CardDescription>
                {filteredFindings.length} of {findings.length} findings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search findings..."
                  className="pl-9 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant={filterStatus || filterSeverity ? 'default' : 'outline'}
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
                <TableHead>Title</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => (
                <TableRow key={finding.findingId}>
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate">{finding.title}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{finding.accountName}</TableCell>
                  <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                  <TableCell>{getCategoryBadge(finding.category)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      {finding.resourceType === 'role' ? <Shield className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      <span className="capitalize">{finding.resourceType}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(finding.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(finding)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {finding.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveFinding(finding.findingId)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Finding Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedFinding && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFinding.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 pt-2">
                  {getSeverityBadge(selectedFinding.severity)}
                  {getCategoryBadge(selectedFinding.category)}
                  {getStatusBadge(selectedFinding.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Resource Info */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Affected Resource</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{selectedFinding.resourceType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account:</span>
                          <span>{selectedFinding.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ARN:</span>
                          <code className="text-xs">{selectedFinding.resourceArn}</code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedFinding.description}
                  </p>
                </div>

                {/* Recommendation */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Recommendation</h3>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {selectedFinding.recommendation}
                    </pre>
                  </div>
                </div>

                {/* Suggested Fix */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Suggested Fix</h3>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{selectedFinding.suggestedFix.description}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedFinding.suggestedFix.steps && (
                        <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                          {selectedFinding.suggestedFix.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                      {selectedFinding.suggestedFix.example && (
                        <div className="mt-3">
                          <div className="text-xs font-medium mb-2">Example Policy:</div>
                          <div className="rounded-lg border bg-background p-3">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(selectedFinding.suggestedFix.example, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {selectedFinding.suggestedFix.alternatives && (
                        <div className="mt-3">
                          <div className="text-xs font-medium mb-2">Alternatives:</div>
                          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                            {selectedFinding.suggestedFix.alternatives.map((alt, i) => (
                              <li key={i}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                {selectedFinding.status === 'open' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleMarkFalsePositive(selectedFinding.findingId)
                        setIsDetailDialogOpen(false)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      False Positive
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleAcceptRisk(selectedFinding.findingId)
                        setIsDetailDialogOpen(false)
                      }}
                    >
                      Accept Risk
                    </Button>
                    <Button
                      onClick={() => {
                        // Navigate to AI Builder with context
                        console.log('Fix with AI Builder:', selectedFinding)
                      }}
                      className="gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      Fix with AI Builder
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        handleResolveFinding(selectedFinding.findingId)
                        setIsDetailDialogOpen(false)
                      }}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Mark Resolved
                    </Button>
                  </>
                )}
                {selectedFinding.status !== 'open' && (
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
