'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Shield,
  FileText,
  AlertTriangle,
  Bot,
  CheckCircle,
  Cloud,
  Settings,
  FileStack
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Roles', href: '/dashboard/roles', icon: Shield },
  { name: 'Policies', href: '/dashboard/policies', icon: FileText },
  { name: 'Findings', href: '/dashboard/findings', icon: AlertTriangle },
  { name: 'AI Builder', href: '/dashboard/ai', icon: Bot },
  { name: 'Apply Requests', href: '/dashboard/apply', icon: CheckCircle },
  { name: 'AWS Accounts', href: '/dashboard/accounts', icon: Cloud },
  { name: 'Audit Log', href: '/dashboard/audit', icon: FileStack },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">IAM Copilot</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-medium">Need help?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check our{' '}
            <a href="#" className="text-primary hover:underline">
              documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
