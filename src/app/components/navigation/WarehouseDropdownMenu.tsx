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
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MdWarehouse } from 'react-icons/md'

interface Props {
  basePath: string
}

/**
 * WarehouseDropdownMenu
 * --------------------------------------------------
 * Top navigation entry for Warehouse module with location selection.
 *
 * Role behavior:
 * - Technician:
 *   - No location context.
 *   - Simple button navigating to technician warehouse view.
 *
 * - Admin:
 *   - Can access ALL locations.
 *   - Always sees dropdown (even if there is only one location).
 *
 * - Coordinator / Warehouseman:
 *   - Restricted to assigned locations only.
 *   - Dropdown shown only if more than one assigned location exists.
 *
 * Notes:
 * - `loc` query param represents UI context, NOT permission.
 * - Backend must always validate location access.
 */
const WarehouseDropdownMenu = ({ basePath }: Props) => {
  const [open, setOpen] = useState(false)

  const { isTechnician, isAdmin } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  /** Fetch all locations only for non-technicians (admin/coordinator/warehouseman) */
  const { data: allLocations = [] } = trpc.core.user.getAllLocations.useQuery(
    undefined,
    {
      enabled: !isTechnician,
    }
  )

  /** Locations assigned directly to the user (non-admin roles) */
  const userLocations = session?.user?.locations ?? []

  /**
   * Determine which locations are available for selection.
   * - Admin: all locations
   * - Others: assigned locations only
   */
  const availableLocations = useMemo(() => {
    return isAdmin ? allLocations : userLocations
  }, [isAdmin, allLocations, userLocations])

  const currentTab = searchParams.get('tab')
  const currentLoc = searchParams.get('loc')

  const isWarehouseSection =
    currentTab === 'warehouse' ||
    pathname.includes('/admin-panel/warehouse/details') ||
    pathname.includes('/admin-panel/warehouse/history')

  /**
   * Force location context for non-admin users with exactly one assigned location.
   * This guarantees consistent URL state and prevents "empty warehouse" views.
   */
  useEffect(() => {
    if (
      !isAdmin &&
      availableLocations.length === 1 &&
      !currentLoc &&
      isWarehouseSection
    ) {
      router.replace(
        `${basePath}/admin-panel?tab=warehouse&loc=${availableLocations[0].id}`
      )
    }
  }, [
    isAdmin,
    availableLocations,
    currentLoc,
    isWarehouseSection,
    router,
    basePath,
  ])

  /** -------------------------------------------
   * Technician view — simple redirect button
   * ------------------------------------------- */
  if (isTechnician) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => router.push(`${basePath}/?tab=warehouse`)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2',
                isWarehouseSection
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-primary-foreground hover:bg-primary'
              )}
            >
              <MdWarehouse className="h-5 w-5 lg:hidden" />
              <span className="hidden lg:inline">Magazyn</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="lg:hidden">
            Magazyn
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  /** -------------------------------------------
   * Single-location (non-admin) — simple button
   * ------------------------------------------- */
  if (!isAdmin && availableLocations.length <= 1) {
    const loc = availableLocations[0]

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() =>
                router.push(
                  `${basePath}/admin-panel?tab=warehouse&loc=${loc?.id ?? ''}`
                )
              }
              className={cn(
                'relative flex items-center gap-2 px-3 py-2',
                isWarehouseSection
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-primary-foreground hover:bg-primary'
              )}
            >
              <MdWarehouse className="h-5 w-5 lg:hidden" />
              <span className="hidden lg:inline">Magazyn</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="lg:hidden">
            Magazyn
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  /** -------------------------------------------
   * Admin / multi-location dropdown
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
                  'relative flex items-center gap-2 px-3 py-2',
                  isWarehouseSection
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-primary-foreground hover:bg-primary'
                )}
              >
                <MdWarehouse className="h-5 w-5 lg:hidden" />
                <span className="hidden lg:inline">Magazyn</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="lg:hidden">
            Magazyn
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="start"
          side="bottom"
          className="bg-background"
        >
          {availableLocations.map((loc) => {
            const isActive = isWarehouseSection && currentLoc === loc.id

            return (
              <DropdownMenuItem
                key={loc.id}
                onClick={() =>
                  router.push(
                    `${basePath}/admin-panel?tab=warehouse&loc=${loc.id}`
                  )
                }
                className={cn(
                  'cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-primary'
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
