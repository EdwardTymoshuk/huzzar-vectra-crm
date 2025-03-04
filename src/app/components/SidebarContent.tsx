'use client'

import {
  MenuItem,
  adminsMenuItems,
  techniciansMenuItems,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import UserDropdown from './UserDropdown'

/**
 * SidebarContent component dynamically updates content without page reload.
 * Uses query parameter "tab" instead of navigating to a new page.
 */
export default function SidebarContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get active tab from URL parameters
  const currentTab = searchParams.get('tab') || 'dashboard'

  // Select menu items based on user role
  const menuItems: MenuItem[] =
    session?.user.role === 'ADMIN' ||
    session?.user.role === 'COORDINATOR' ||
    session?.user.role === 'WAREHOUSEMAN'
      ? adminsMenuItems
      : techniciansMenuItems

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />

      {/* Navigation menu */}
      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.key}
            onClick={() => router.push(`/admin-panel?tab=${item.key}`)}
            className={cn(
              'flex items-center p-3 transition cursor-pointer text-background',
              currentTab === item.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted hover:text-accent-foreground'
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.name}</span>
          </div>
        ))}
      </nav>

      {/* User settings and theme toggle */}
      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}
