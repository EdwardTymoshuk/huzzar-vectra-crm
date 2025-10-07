// components/warehouse/history/HistoryFilters.tsx
'use client'

/**
 * HistoryFilters – warehouse-history filter controls.
 */

import DateRangePicker from '@/app/components/shared/DateRangePicker'
import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { warehouseActionMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'
import { WarehouseAction } from '@prisma/client'

interface Props {
  actions?: WarehouseAction[]
  setActions: (val: WarehouseAction[] | undefined) => void
  performerId?: string
  setPerformerId: (val: string | undefined) => void
  startDate?: Date
  setStartDate: (val: Date | undefined) => void
  endDate?: Date
  setEndDate: (val: Date | undefined) => void
  locationId?: string
  setLocationId: (val: string | undefined) => void
}

const HistoryFilters = ({
  actions,
  setActions,
  performerId,
  setPerformerId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  locationId,
  setLocationId,
}: Props) => {
  // Fetch list of users that can appear in "performer" dropdown
  const { data: users = [] } = trpc.user.getAdmins.useQuery()

  // Fetch list of warehosue locations
  const { data: locations = [] } = trpc.warehouse.getAllLocations.useQuery()

  return (
    <form
      /* Mobile = column; Desktop = original row layout */
      className="
        flex flex-col gap-3
        md:flex-row md:flex-wrap md:items-end md:gap-4
      "
    >
      {/* ---- ACTION FILTER -------------------------------------------------- */}
      <div className="flex flex-col space-y-1 w-full md:w-auto">
        <label className="text-xs text-muted-foreground">Typ operacji</label>
        <Select
          value={actions?.[0] ?? ''}
          onValueChange={(val) =>
            setActions(val ? [val as WarehouseAction] : undefined)
          }
        >
          <SelectTrigger
            className={cn(
              'w-full md:w-[180px]',
              actions && 'border-2 border-primary'
            )}
          >
            <SelectValue placeholder="Wszystkie" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(warehouseActionMap).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---- LOCATION FILTER ----------------------------------------------- */}
      <div className="flex flex-col space-y-1 w-full md:w-auto">
        <label className="text-xs text-muted-foreground">Magazyn</label>
        <Select
          value={locationId ?? ''}
          onValueChange={(val) => setLocationId(val || undefined)}
        >
          <SelectTrigger
            className={cn(
              'w-full md:w-[200px]',
              locationId && 'border-2 border-primary'
            )}
          >
            <SelectValue placeholder="Wszystkie lokalizacje" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---- PERFORMER FILTER ---------------------------------------------- */}
      <div className="flex flex-col space-y-1 w-full md:w-auto">
        <label className="text-xs text-muted-foreground">Wykonane przez</label>
        <Select
          value={performerId ?? ''}
          onValueChange={(val) => setPerformerId(val || undefined)}
        >
          <SelectTrigger
            className={cn(
              'w-full md:w-[200px]',
              performerId && 'border-2 border-primary'
            )}
          >
            <SelectValue placeholder="Wszyscy użytkownicy" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---- DATE RANGE PICKER --------------------------------------------- */}
      <div className="flex flex-col space-y-1 w-full md:w-auto">
        <label className="text-xs text-muted-foreground">Zakres dat</label>
        <DateRangePicker
          from={startDate}
          to={endDate}
          setFrom={setStartDate}
          setTo={setEndDate}
        />
      </div>

      {/* ---- RESET BUTTON --------------------------------------------------- */}
      <Button
        type="button"
        variant="secondary"
        className="w-full md:w-auto"
        onClick={() => {
          setActions(undefined)
          setPerformerId(undefined)
          setStartDate(undefined)
          setEndDate(undefined)
          setLocationId(undefined)
        }}
      >
        Wyczyść filtry
      </Button>
    </form>
  )
}

export default HistoryFilters
