'use client'

import Logo from '@/app/components/Logo'
import ThemeToggle from '@/app/components/ThemeToggle'
import UserDropdown from '@/app/components/UserDropdown'
import { techniciansMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

type SidebarContentProps = {
  onSelect?: () => void
}

/**
 * SidebarContentTechnician:
 * - Handles navigation and active highlighting for technician routes.
 * - Reads `tab` from query string or fallback from pathname.
 */
const SidebarContentTechnician = ({ onSelect }: SidebarContentProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab')
    if (pathname?.includes('/orders/details')) return 'orders'
    if (pathname?.includes('/warehouse')) return 'warehouse'
    return tabParam || 'dashboard'
  }, [searchParams, pathname])

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />

      <nav className="flex-1 pt-8 space-y-2">
        {techniciansMenuItems.map((item: MenuItem) => {
          const isActive =
            currentTab === item.key || pathname?.includes(`/${item.key}`)

          return (
            <div
              key={item.key}
              onClick={() => {
                router.push(`?tab=${item.key}`)
                onSelect?.()
              }}
              className={cn(
                'flex items-center p-3 transition cursor-pointer text-background',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}

export default SidebarContentTechnician
