'use client'

import Logo from '@/app/components/Logo'
import ThemeToggle from '@/app/components/ThemeToggle'
import UserDropdown from '@/app/components/UserDropdown'
import { adminsMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import WarehouseAccordionMenu from '../admin-panel/components/warehouse/warehouseLocalizations/WarehouseAccordionMenu'
import LoaderSpinner from './shared/LoaderSpinner'

type SidebarContentProps = {
  onSelect?: () => void
}

const SidebarContent = ({ onSelect }: SidebarContentProps) => {
  const { isWarehouseman, isLoading: isPageLoading } = useRole()

  if (isPageLoading) return <LoaderSpinner />

  return (
    <SidebarContentInner onSelect={onSelect} isWarehouseman={isWarehouseman} />
  )
}

export default SidebarContent

// ------------------ INNER ------------------

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
  const { isAdmin, isCoordinator } = useRole()

  const currentTab = useMemo<string>(() => {
    const tabParam = searchParams.get('tab')
    if (pathname?.includes('/admin-panel/warehouse/details')) return 'warehouse'
    if (pathname?.includes('/admin-panel/warehouse/history')) return 'warehouse'
    if (pathname?.includes('/admin-panel/billing/technician')) return 'billing'
    return tabParam ?? 'dashboard'
  }, [searchParams, pathname])

  const menuItems: MenuItem[] = useMemo(() => {
    return isWarehouseman
      ? adminsMenuItems.filter((item) =>
          ['warehouse', 'orders'].includes(item.key)
        )
      : adminsMenuItems
  }, [isWarehouseman])

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />

      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => {
          const isTabMatch = currentTab === item.key
          const isDetailsPage = pathname?.startsWith(`/admin-panel/${item.key}`)
          const isActive =
            item.key === 'orders'
              ? isTabMatch || pathname?.includes('/orders')
              : isTabMatch || isDetailsPage

          // Special handling for Warehouse
          if (
            item.key === 'warehouse' &&
            (isAdmin || isCoordinator || isWarehouseman)
          ) {
            return <WarehouseAccordionMenu key="warehouse" />
          }

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

      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}
