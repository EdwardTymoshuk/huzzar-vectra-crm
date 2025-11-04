'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MdWarehouse } from 'react-icons/md'

interface Props {
  /** Defines navigation path context for technician or admin */
  isTechnician: boolean
}

/**
 * WarehouseDropdownMenuMobile
 *
 * Mobile navigation item for multi-warehouse support.
 * - Displays as a single button in bottom navigation.
 * - Opens dropdown with available warehouse locations.
 * - Highlights both active section and selected location.
 * - Shows a chevron icon to indicate dropdown availability.
 */
const WarehouseDropdownMenuMobile = ({ isTechnician }: Props) => {
  const { data: locations = [] } = trpc.warehouse.getUserLocations.useQuery(
    undefined,
    {
      enabled: !isTechnician,
    }
  )
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)

  const currentTab = searchParams.get('tab')
  const currentLoc = searchParams.get('loc')

  const isWarehouseSection =
    currentTab === 'warehouse' ||
    pathname.includes('/warehouse/details') ||
    pathname.includes('/warehouse/history')

  // ---- CASE: single warehouse (no dropdown) ----
  if (locations.length <= 1) {
    const loc = locations[0]
    const isActive = isWarehouseSection

    return (
      <Button
        variant="ghost"
        onClick={() =>
          router.push(
            isTechnician
              ? `/?tab=warehouse`
              : `/admin-panel?tab=warehouse&loc=${loc?.id ?? ''}`
          )
        }
        className={cn(
          'flex flex-1 flex-col items-center justify-center text-sm sm:text-lg font-medium transition-colors select-none focus-visible:outline-none px-2 h-full py-4 rounded-none',
          isActive
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
            : 'text-muted-foreground hover:text-accent-foreground'
        )}
      >
        <MdWarehouse className="h-6 w-6 sm:scale-150" />
        <span className="">Magazyn</span>
      </Button>
    )
  }

  // ---- CASE: multiple warehouses → dropdown ----
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex flex-col items-center justify-center text-sm sm:text-lg font-medium transition-colors select-none focus-visible:outline-none px-2 w-full h-full py-4 rounded-none relative',
            /**
             * Highlight warehouse button as active when any warehouse tab
             * or its subpage (details/history) is currently open.
             */
            isWarehouseSection
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-accent-foreground'
          )}
        >
          <div className="flex items-center justify-center gap-1">
            <MdWarehouse className="h-6 w-6 sm:scale-150" />
            {/* Chevron indicating dropdown state */}
          </div>
          <span className="inline-flex items-center gap-1 justify-center align-middle">
            Magazyn
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="center"
        className="bg-background border border-border rounded-md shadow-none w-fit"
      >
        {locations.map((loc) => {
          const isLocActive = isWarehouseSection && currentLoc === loc.id
          return (
            <DropdownMenuItem
              key={loc.id}
              onClick={() => {
                router.push(
                  isTechnician
                    ? `/?tab=warehouse&loc=${loc.id}`
                    : `/admin-panel?tab=warehouse&loc=${loc.id}`
                )
                setOpen(false)
              }}
              className={cn(
                'cursor-pointer text-sm flex items-center gap-2 px-3 py-2 rounded-sm transition-colors',
                isLocActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {loc.name}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default WarehouseDropdownMenuMobile
