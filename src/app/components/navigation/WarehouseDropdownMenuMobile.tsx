'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MdWarehouse } from 'react-icons/md'
import { getMobileNavItemClass } from './navItemStyles'

interface Props {
  /** Defines navigation path context for technician or admin */
  isTechnician: boolean
  basePath: string
}

/**
 * WarehouseDropdownMenuMobile
 * --------------------------------------------------
 * Mobile bottom navigation entry for Warehouse module.
 *
 * Role behavior:
 * - Technician:
 *   - No location context.
 *   - Simple button redirecting to technician warehouse view.
 *
 * - Admin:
 *   - Can access ALL locations.
 *   - Always sees dropdown when multiple locations exist.
 *
 * - Coordinator / Warehouseman:
 *   - Restricted to assigned locations only.
 *   - Dropdown shown only if more than one assigned location exists.
 *
 * Notes:
 * - `loc` query param is UI context only.
 * - Backend must always validate location permissions.
 */
const WarehouseDropdownMenuMobile = ({ isTechnician, basePath }: Props) => {
  const [open, setOpen] = useState(false)

  const { isAdmin } = useRole()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  /** Fetch all locations only for non-technicians */
  const { data: allLocations = [] } = trpc.core.user.getAllLocations.useQuery(
    undefined,
    {
      enabled: !isTechnician,
    }
  )

  /** Locations assigned to current user (non-admin roles) */
  const { data: userLocations = [] } = trpc.core.user.getUserLocations.useQuery(
    undefined,
    {
      enabled: !isTechnician && !isAdmin,
    }
  )

  /**
   * Determine available locations based on role.
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
    pathname.includes('/warehouse/details') ||
    pathname.includes('/warehouse/history') ||
    pathname.includes('/warehouse/issue') ||
    pathname.includes('/warehouse/receive') ||
    pathname.includes('/warehouse/return') ||
    pathname.includes('/warehouse/transfer')

  /**
   * Force location context for non-admin users with exactly one assigned location.
   * Prevents ambiguous warehouse state on mobile.
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
   * Technician view — simple navigation button
   * ------------------------------------------- */
  if (isTechnician) {
    return (
      <Button
        variant="ghost"
        onClick={() => router.push(`${basePath}/?tab=warehouse`)}
        className={cn(
          getMobileNavItemClass(isWarehouseSection)
        )}
      >
        <MdWarehouse className="h-5 w-5" />
        <span>Magazyn</span>
      </Button>
    )
  }

  /** -------------------------------------------
   * Single-location (non-admin) — simple button
   * ------------------------------------------- */
  if (!isAdmin && availableLocations.length <= 1) {
    const loc = availableLocations[0]

    return (
      <Button
        variant="ghost"
        onClick={() =>
          router.push(
            `${basePath}/admin-panel?tab=warehouse&loc=${loc?.id ?? ''}`
          )
        }
        className={cn(
          getMobileNavItemClass(isWarehouseSection)
        )}
      >
        <MdWarehouse className="h-5 w-5" />
        <span>Magazyn</span>
      </Button>
    )
  }

  /** -------------------------------------------
   * Admin / multi-location dropdown
   * ------------------------------------------- */
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            getMobileNavItemClass(isWarehouseSection)
          )}
        >
          <MdWarehouse className="h-5 w-5" />
          <span>Magazyn</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="center"
        className="bg-background border border-border rounded-md w-fit"
      >
        {availableLocations.map((loc) => {
          const isLocActive = isWarehouseSection && currentLoc === loc.id

          return (
            <DropdownMenuItem
              key={loc.id}
              onClick={() => {
                router.push(
                  `${basePath}/admin-panel?tab=warehouse&loc=${loc.id}`
                )
                setOpen(false)
              }}
              className={cn(
                'cursor-pointer text-sm px-3 py-2',
                isLocActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-accent'
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
