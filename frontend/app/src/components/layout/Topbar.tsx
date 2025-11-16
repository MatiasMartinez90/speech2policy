'use client'

import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TopbarProps {
  title?: string
  onSignOut?: () => void
}

export function Topbar({ title = 'Dashboard', onSignOut }: TopbarProps) {
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    } else {
      // Default sign out behavior
      window.location.href = '/'
    }
  }

  return (
    <div className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Title / Breadcrumbs */}
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
