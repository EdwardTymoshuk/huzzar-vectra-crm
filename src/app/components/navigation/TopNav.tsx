'use client'

import Logo from '@/app/components/Logo'
import NotificationDropdown from '@/app/components/NotificationDropdown'
import UserDropdown from '@/app/components/UserDropdown'
import WarehouseDropdownMenu from '@/app/components/navigation/WarehouseDropdownMenu'
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

interface NavProps {
  menuItems: MenuItem[]
  activeKey: string
  router: AppRouterInstance
  isTechnician?: boolean
  isWarehouseman?: boolean
  basePath: string
  moduleLabel: string
}

/** Desktop top navigation */
const TopNav = ({
  menuItems,
  activeKey,
  router,
  isTechnician,
  isWarehouseman,
  basePath,
  moduleLabel,
}: NavProps) => {
  /** Restrict items for warehouseman */
  const filteredItems = isWarehouseman
    ? menuItems.filter((item) => ['warehouse', 'orders'].includes(item.key))
    : menuItems

  return (
    <header className="hidden fixed md:flex items-center justify-between w-full bg-secondary border-b border-border px-4 py-2 gap-3 z-50">
      <div className="flex items-center gap-1">
        <Logo className="h-auto" widthClass="w-36" />

        <span className="flex items-center text-white font-semibold">|</span>
        <span className="flex items-center text-white font-semibold text-sm uppercase">
          {moduleLabel}
        </span>
      </div>

      <TooltipProvider>
        <nav className="flex items-center gap-1">
          {filteredItems.map((item) => {
            if (item.key === 'warehouse') {
              return (
                <WarehouseDropdownMenu key="warehouse" basePath={basePath} />
              )
            }

            const isActive = activeKey === item.key
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'relative text-sm px-3 py-2 rounded-md',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-primary-foreground hover:bg-primary'
                    )}
                    onClick={() =>
                      router.push(
                        isTechnician
                          ? `${basePath}/?tab=${item.key}`
                          : `${basePath}/admin-panel?tab=${item.key}`
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 lg:hidden" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Button>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="lg:hidden">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </TooltipProvider>

      <div className="flex items-center gap-3">
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}

export default TopNav
