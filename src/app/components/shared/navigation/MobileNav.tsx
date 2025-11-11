'use client'

import WarehouseDropdownMenuMobile from '@/app/admin-panel/components/warehouse/warehouseLocalizations/WarehouseDropdownMenuMobile'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { Menu } from 'lucide-react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface MobileNavProps {
  /** List of navigation items available for current user role */
  menuItems: MenuItem[]
  /** Key of currently active tab for visual highlighting */
  activeKey: string
  /** Next.js App Router instance for client-side navigation */
  router: AppRouterInstance
  /** Defines navigation path context for technician or admin */
  isTechnician: boolean
}

/**
 * MobileNav
 *
 * Fixed bottom navigation bar optimized for mobile screens.
 * - Displays main modules as bottom buttons.
 * - “More” dropdown includes theme toggle and hidden menu sections.
 */
const MobileNav = ({
  menuItems,
  activeKey,
  router,
  isTechnician,
}: MobileNavProps) => {
  /** Main visible modules (dashboard, orders, etc.) */
  /** Main visible modules (dashboard, orders, etc.) */
  const mainModules = isTechnician
    ? ['dashboard', 'orders', 'planer', 'planning', 'warehouse', 'billing']
    : ['dashboard', 'orders', 'planer', 'planning', 'warehouse']

  const visibleItems = menuItems.filter((item) =>
    mainModules.includes(item.key)
  )
  const hiddenItems = menuItems.filter(
    (item) => !mainModules.includes(item.key)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-stretch bg-secondary border-t border-border pb-[env(safe-area-inset-bottom)]">
      {/* ---- Visible main modules ---- */}
      {visibleItems.map((item) => {
        if (item.key === 'warehouse') {
          return (
            <div key="warehouse" className="flex-1 flex items-stretch">
              <WarehouseDropdownMenuMobile
                key="warehouse"
                isTechnician={isTechnician}
              />
            </div>
          )
        }

        const isActive = activeKey === item.key
        return (
          <Button
            variant="ghost"
            key={item.key}
            onClick={() =>
              router.push(
                isTechnician
                  ? `/?tab=${item.key}`
                  : `/admin-panel?tab=${item.key}`
              )
            }
            className={cn(
              'flex flex-1 flex-col items-center justify-center text-sm sm:text-lg font-medium transition-colors select-none focus-visible:outline-none px-2 h-full py-4 rounded-none',
              isActive
                ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
                : 'text-primary-foreground hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-6 w-6 sm:scale-150" />
            <span>{item.name}</span>
          </Button>
        )
      })}

      {/* ---- "More" dropdown ---- */}
      {hiddenItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'flex flex-col items-center justify-center text-sm sm:text-base font-medium transition-colors px-2 py-4 focus-visible:outline-none h-auto rounded-none flex-1',
                hiddenItems.some((item) => item.key === activeKey)
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
                  : 'text-primary-foreground hover:text-accent-foreground'
              )}
            >
              <Menu className="h-6 w-6 sm:scale-150" />
              <span className="leading-none">Więcej</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="center"
            className="bg-background border border-border rounded-md shadow-md w-64"
          >
            {/* ---- Hidden menu items ---- */}
            {hiddenItems.map((item) => {
              const isActive = activeKey === item.key
              return (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() =>
                    router.push(
                      isTechnician
                        ? `/?tab=${item.key}`
                        : `/admin-panel?tab=${item.key}`
                    )
                  }
                  className={cn(
                    'cursor-pointer text-sm sm:text-base flex items-center gap-2 px-3 py-2 rounded-sm transition-colors',
                    isActive
                      ? 'bg-primary hover:bg-primary text-primary-foreground hover:text-primary-foreground font-semibold'
                      : 'text-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="h-6 w-6 sm:scale-125" />
                  {item.name}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  )
}

export default MobileNav
