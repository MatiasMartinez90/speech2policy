'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Shield, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Mock data
const kpis = [
  {
    title: 'Total Roles',
    value: '127',
    change: '+5 this week',
    icon: Shield,
    trend: 'up',
  },
  {
    title: 'High Risk Policies',
    value: '23',
    change: '-3 from last week',
    icon: AlertTriangle,
    trend: 'down',
    variant: 'warning' as const,
  },
  {
    title: 'Critical Findings',
    value: '8',
    change: 'Needs attention',
    icon: AlertTriangle,
    trend: 'neutral',
    variant: 'danger' as const,
  },
  {
    title: 'Pending Approvals',
    value: '4',
    change: '2 expiring soon',
    icon: CheckCircle,
    trend: 'neutral',
  },
]

const riskyRoles = [
  {
    name: 'AdminRole',
    account: 'production',
    riskScore: 95,
    lastAccessed: '2 hours ago',
    level: 'CRITICAL' as const,
  },
  {
    name: 'PowerUserRole',
    account: 'production',
    riskScore: 78,
    lastAccessed: '1 day ago',
    level: 'HIGH' as const,
  },
  {
    name: 'S3FullAccessRole',
    account: 'staging',
    riskScore: 72,
    lastAccessed: '3 days ago',
    level: 'HIGH' as const,
  },
  {
    name: 'LambdaExecutionRole',
    account: 'development',
    riskScore: 45,
    lastAccessed: '5 hours ago',
    level: 'MEDIUM' as const,
  },
  {
    name: 'ReadOnlyRole',
    account: 'production',
    riskScore: 15,
    lastAccessed: '10 minutes ago',
    level: 'LOW' as const,
  },
]

function getRiskBadge(level: string) {
  switch (level) {
    case 'CRITICAL':
      return <Badge variant="danger">CRITICAL</Badge>
    case 'HIGH':
      return <Badge variant="warning">HIGH</Badge>
    case 'MEDIUM':
      return <Badge variant="secondary">MEDIUM</Badge>
    case 'LOW':
      return <Badge variant="success">LOW</Badge>
    default:
      return <Badge>{level}</Badge>
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your AWS IAM security posture
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/ai">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analyze with AI
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">
                {kpi.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Trend (Last 30 Days)</CardTitle>
          <CardDescription>
            Track your overall security posture over time
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          Chart placeholder - Will integrate Recharts
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Risky Roles</CardTitle>
              <CardDescription>
                Roles with the highest security risk scores
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/roles">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Last Accessed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskyRoles.map((role) => (
                <TableRow key={role.name}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.account}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">{role.riskScore}</div>
                      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className={"h-full " + (
                            role.riskScore >= 70
                              ? 'bg-red-500'
                              : role.riskScore >= 40
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          )}
                          style={{ width: role.riskScore + '%' }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(role.level)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.lastAccessed}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Analyze
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent transition-colors" asChild>
          <Link href="/dashboard/ai">
            <CardHeader>
              <CardTitle className="text-lg">Generate Policy with AI</CardTitle>
              <CardDescription>
                Create secure IAM policies using natural language
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" asChild>
          <Link href="/dashboard/findings">
            <CardHeader>
              <CardTitle className="text-lg">Review Findings</CardTitle>
              <CardDescription>
                Address security issues detected in your IAM configuration
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" asChild>
          <Link href="/dashboard/accounts">
            <CardHeader>
              <CardTitle className="text-lg">Connect AWS Account</CardTitle>
              <CardDescription>
                Add new AWS accounts to analyze and manage
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
