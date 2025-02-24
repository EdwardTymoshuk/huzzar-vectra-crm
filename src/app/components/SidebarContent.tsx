'use client'

import { adminsMenuItems, techniciansMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import UserDropdown from './UserDropdown'

/**
 * SidebarContent component renders dynamic navigation links
 * based on the authenticated user's role.
 */
export default function SidebarContent() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Dynamically select menu items based on user role
  const menuItems =
    pathname.startsWith('/admin-panel') ||
    session?.user.role === 'ADMIN' ||
    session?.user.role === 'COORDINATOR' ||
    session?.user.role === 'WAREHOUSEMAN'
      ? adminsMenuItems
      : techniciansMenuItems

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />
      {/* Dynamic navigation menu */}
      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <div
              className={cn(
                'flex items-center p-3 transition cursor-pointer text-background',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </div>
          </Link>
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
