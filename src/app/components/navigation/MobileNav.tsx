'use client'

import WarehouseDropdownMenuMobile from '@/app/components/navigation/WarehouseDropdownMenuMobile'
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
import { getMobileNavItemClass } from './navItemStyles'

interface MobileNavProps {
  menuItems: MenuItem[]
  activeKey: string
  router: AppRouterInstance
  isTechnician: boolean
  isWarehouseman?: boolean
  basePath: string
}

/** Mobile bottom navigation */
const MobileNav = ({
  menuItems,
  activeKey,
  router,
  isTechnician,
  isWarehouseman,
  basePath,
}: MobileNavProps) => {
  /** Visible tabs depending on role */
  const mainModules = isWarehouseman
    ? ['warehouse', 'orders']
    : isTechnician
    ? ['dashboard', 'orders', 'planer', 'planning', 'warehouse', 'billing']
    : ['dashboard', 'orders', 'planer', 'planning', 'warehouse']

  const visibleItems = menuItems.filter((item) =>
    mainModules.includes(item.key)
  )
  const hiddenItems = menuItems.filter(
    (item) => !mainModules.includes(item.key)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-stretch border-t border-border bg-secondary/95 shadow-[0_-4px_12px_rgba(0,0,0,0.18)] backdrop-blur ios-safe-bottom">
      {visibleItems.map((item) => {
        if (item.key === 'warehouse') {
          return (
            <div key="warehouse" className="flex-1 flex items-stretch">
              {isTechnician ? (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`${basePath}/?tab=warehouse`)}
                  className={getMobileNavItemClass(activeKey === 'warehouse')}
                >
                  <item.icon className="h-5 w-5" />
                  <span>Magazyn</span>
                </Button>
              ) : (
                <WarehouseDropdownMenuMobile
                  isTechnician={false}
                  basePath={basePath}
                />
              )}
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
                  ? `${basePath}/?tab=${item.key}`
                  : `${basePath}/admin-panel?tab=${item.key}`
              )
            }
            className={cn(
              getMobileNavItemClass(isActive)
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Button>
        )
      })}

      {hiddenItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                getMobileNavItemClass(
                  hiddenItems.some((item) => item.key === activeKey)
                ),
                'my-auto'
              )}
            >
              <Menu className="h-5 w-5" />
              <span>Więcej</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="center"
            className="w-64 bg-background"
          >
            {hiddenItems.map((item) => {
              const isActive = activeKey === item.key
              return (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() =>
                    router.push(
                      isTechnician
                        ? `${basePath}/?tab=${item.key}`
                        : `${basePath}/admin-panel?tab=${item.key}`
                    )
                  }
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
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
