'use client'

import WarehouseDropdownMenu from '@/app/admin-panel/components/warehouse/warehouseLocalizations/WarehouseDropdownMenu'
import Logo from '@/app/components/Logo'
import UserDropdown from '@/app/components/UserDropdown'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import NotificationDropdown from '../NotificationDropdown'

interface NavProps {
  /** List of navigation menu items */
  menuItems: MenuItem[]
  /** Currently active navigation key */
  activeKey: string
  /** Next.js router instance for navigation */
  router: AppRouterInstance
  /** Defines if view belongs to technician context */
  isTechnician?: boolean
}

/**
 * TopNav
 *
 * Main desktop navigation bar.
 * - Displays logo, navigation menu, notifications, and user dropdown.
 * - Fixed at the top with subtle border and background.
 * - Uses Tooltip for compact icon-only navigation on smaller widths.
 */
const TopNav = ({ menuItems, activeKey, router, isTechnician }: NavProps) => {
  return (
    <header className="hidden fixed md:flex items-center justify-between w-full bg-secondary border-b border-border px-4 py-2 overflow-hidden gap-1 lg:gap-4 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 shrink-1 p-2">
        <Logo className="h-auto" widthClass="w-36" />
      </div>

      {/* Center: Navigation buttons */}
      <TooltipProvider>
        <nav className="flex items-center gap-1 flex-nowrap overflow-hidden scrollbar-none">
          {menuItems.map((item) => {
            if (item.key === 'warehouse') {
              return <WarehouseDropdownMenu key="warehouse" />
            }

            const isActive = activeKey === item.key
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <Button
                    key={item.key}
                    variant="ghost"
                    className={cn(
                      'relative flex items-center justify-center whitespace-nowrap text-sm font-medium px-3 py-2 min-w-[44px] rounded-md transition-colors duration-150 gap-0',
                      isActive
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
                        : 'text-primary-foreground hover:text-accent-foreground hover:bg-primary'
                    )}
                    onClick={() =>
                      router.push(
                        isTechnician
                          ? `/?tab=${item.key}`
                          : `/admin-panel?tab=${item.key}`
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 lg:hidden" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Button>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  className="block lg:hidden bg-primary text-primary-hoverforeground text-xs font-medium rounded-md px-2 py-1"
                >
                  {item.name}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </TooltipProvider>

      {/* Right: Notifications and User menu */}
      <div className="flex items-center gap-3 shrink-0">
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}

export default TopNav
