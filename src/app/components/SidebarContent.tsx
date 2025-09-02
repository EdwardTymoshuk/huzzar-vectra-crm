'use client'

import { adminsMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { useRole } from '@/utils/roleHelpers/useRole'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import UserDropdown from './UserDropdown'
import LoaderSpinner from './shared/LoaderSpinner'

/**
 * SidebarContent:
 * - Dynamically renders the menu items based on the user's role.
 * - Highlights the active menu based on `tab` query or current URL pathname.
 * - Ensures that detail subpages (like /admin-panel/warehouse/details/[name]) also show correct sidebar highlight.
 */

type SidebarContentProps = {
  onSelect?: () => void // Optional callback to close sheet on mobile
}

const SidebarContent = ({ onSelect }: SidebarContentProps) => {
  // Extract current user's role from session for role-based access control
  const { isWarehouseman, isLoading: isPageLoading } = useRole()

  if (isPageLoading) return <LoaderSpinner />

  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Get active tab from query params or default to 'dashboard'
  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab')

    // 👇 Obsługa tras podstronowych (np. /admin-panel/warehouse/details/[name])
    if (pathname?.includes('/admin-panel/warehouse/details')) return 'warehouse'
    if (pathname?.includes('/admin-panel/warehouse/history')) return 'warehouse'
    if (pathname?.includes('/admin-panel/billing/technician')) return 'billing'

    return tabParam || 'dashboard'
  }, [searchParams, pathname])

  // Choose correct menu items based on user role
  const menuItems: MenuItem[] = useMemo(() => {
    if (isWarehouseman) {
      return adminsMenuItems.filter((item) =>
        ['warehouse', 'orders'].includes(item.key)
      )
    }
    return adminsMenuItems
  }, [isWarehouseman])

  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Logo at the top */}
      <Logo className="justify-center w-full" />

      {/* Main navigation menu */}
      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => {
          // Check if current tab matches menu key
          const isTabMatch = currentTab === item.key

          // Check if the pathname matches detail subpages (e.g. /admin-panel/warehouse/details/[name])
          const isDetailsPage = pathname?.startsWith(`/admin-panel/${item.key}`)

          // Special case: orders tab includes planning and subroutes
          const isActive =
            item.key === 'orders'
              ? isTabMatch ||
                currentTab === 'planning' ||
                pathname?.includes('/orders')
              : isTabMatch || isDetailsPage

          return (
            <div
              key={item.key}
              onClick={() => {
                router.push(`/admin-panel?tab=${item.key}`)
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

      {/* Bottom section: user and theme controls */}
      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}

export default SidebarContent
