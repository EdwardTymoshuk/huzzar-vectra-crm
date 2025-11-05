'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MdWarehouse } from 'react-icons/md'

/**
 * WarehouseDropdownMenu
 *
 * Desktop dropdown for selecting warehouse locations.
 * - Technicians: simple button → navigates to technician warehouse.
 * - Admins/Coordinators: dropdown with available warehouse locations.
 */
const WarehouseDropdownMenu = () => {
  const { isTechnician } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  // Fetch locations only for admin roles
  const { data: locations = [] } = trpc.warehouse.getUserLocations.useQuery(
    undefined,
    { enabled: !isTechnician }
  )

  const currentTab = searchParams.get('tab')
  const currentLoc = searchParams.get('loc')
  const isWarehouseSection =
    currentTab === 'warehouse' ||
    pathname.includes('/admin-panel/warehouse/details') ||
    pathname.includes('/admin-panel/warehouse/history')

  /** -------------------------------------------
   * Technician view — simple redirect button
   * ------------------------------------------- */
  if (isTechnician) {
    const isActive = isWarehouseSection
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => router.push('/?tab=warehouse')}
              className={cn(
                'relative flex items-center justify-center whitespace-nowrap text-sm font-medium px-3 py-2 rounded-md transition-colors gap-2',
                isActive
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
                  : 'text-primary-foreground hover:bg-primary hover:text-accent-foreground'
              )}
            >
              <MdWarehouse className="h-5 w-5 lg:hidden" />
              <span className="hidden lg:inline">Magazyn</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="block lg:hidden bg-primary text-white text-xs font-medium rounded-md px-2 py-1"
          >
            Magazyn
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  /** -------------------------------------------
   * Admin / Coordinator — multiple locations
   * ------------------------------------------- */
  if (locations.length <= 1) {
    const loc = locations[0]
    const isActive = isWarehouseSection
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() =>
                router.push(`/admin-panel?tab=warehouse&loc=${loc?.id ?? ''}`)
              }
              className={cn(
                'relative flex items-center justify-center whitespace-nowrap text-sm font-medium px-3 py-2 rounded-md transition-colors gap-2',
                isActive
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foregroundfont-semibold'
                  : 'text-primary-foreground hover:text-accent-foreground'
              )}
            >
              <MdWarehouse className="h-5 w-5 lg:hidden" />
              <span className="hidden lg:inline">Magazyn</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="block lg:hidden bg-primary text-white text-xs font-medium rounded-md px-2 py-1"
          >
            Magazyn
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  /** -------------------------------------------
   * Admin / Coordinator — dropdown with locations
   * ------------------------------------------- */
  return (
    <TooltipProvider>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'relative flex items-center justify-center whitespace-nowrap text-sm font-medium px-3 py-2 rounded-md transition-colors gap-2',
                  isWarehouseSection
                    ? 'bg-primary text-primary-foreground hover:bg-primary font-semibold'
                    : 'text-primary-foreground hover:text-accent-foreground hover:bg-primary'
                )}
              >
                <MdWarehouse className="h-5 w-5 lg:hidden" />
                <span className="hidden lg:inline">Magazyn</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="block lg:hidden bg-primary hover:bg-primary text-primary-foreground text-xs font-medium rounded-md px-2 py-1"
          >
            Magazyn
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="start"
          side="bottom"
          className="w-fit bg-background"
        >
          {locations.map((loc) => {
            const isLocActive = isWarehouseSection && currentLoc === loc.id
            return (
              <DropdownMenuItem
                key={loc.id}
                onClick={() =>
                  router.push(`/admin-panel?tab=warehouse&loc=${loc.id}`)
                }
                className={cn(
                  'cursor-pointer text-sm flex items-center gap-2 px-3 py-1.5 rounded-sm transition-colors',
                  isLocActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
                    : 'text-foreground hover:text-foreground hover:bg-primary'
                )}
              >
                {loc.name}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

export default WarehouseDropdownMenu
