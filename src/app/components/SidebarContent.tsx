// src/app/components/SidebarContent.tsx
'use client'

import Logo from '@/app/components/Logo'
import ThemeToggle from '@/app/components/ThemeToggle'
import UserDropdown from '@/app/components/UserDropdown'
import { adminsMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { useRole } from '@/utils/roleHelpers/useRole'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import LoaderSpinner from './shared/LoaderSpinner'

type SidebarContentProps = {
  onSelect?: () => void
}

/**
 * SidebarContent (Guard):
 * - Keeps hook order stable by returning loader early,
 *   then delegating to the Inner component which calls other hooks unconditionally.
 */
const SidebarContent = ({ onSelect }: SidebarContentProps) => {
  const { isWarehouseman, isLoading: isPageLoading } = useRole()

  // Early return lives in the guard wrapper only – other hooks are not called yet.
  if (isPageLoading) return <LoaderSpinner />

  return (
    <SidebarContentInner onSelect={onSelect} isWarehouseman={isWarehouseman} />
  )
}

export default SidebarContent

// ------------------ INNER ------------------

/**
 * SidebarContentInner:
 * - Calls navigation and memo hooks unconditionally to satisfy React rules-of-hooks.
 */
const SidebarContentInner = ({
  onSelect,
  isWarehouseman,
}: {
  onSelect?: () => void
  isWarehouseman: boolean
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Determine active tab; handle detail subpaths explicitly.
  const currentTab = useMemo<string>(() => {
    const tabParam = searchParams.get('tab')
    if (pathname?.includes('/admin-panel/warehouse/details')) return 'warehouse'
    if (pathname?.includes('/admin-panel/warehouse/history')) return 'warehouse'
    if (pathname?.includes('/admin-panel/billing/technician')) return 'billing'
    return tabParam ?? 'dashboard'
  }, [searchParams, pathname])

  // Filter menu items for warehouseman role.
  const menuItems: MenuItem[] = useMemo(() => {
    return isWarehouseman
      ? adminsMenuItems.filter((item) =>
          ['warehouse', 'orders'].includes(item.key)
        )
      : adminsMenuItems
  }, [isWarehouseman])

  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Top logo */}
      <Logo className="justify-center w-full" />

      {/* Main nav */}
      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => {
          const isTabMatch = currentTab === item.key
          const isDetailsPage = pathname?.startsWith(`/admin-panel/${item.key}`)
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

      {/* Bottom panel */}
      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}
