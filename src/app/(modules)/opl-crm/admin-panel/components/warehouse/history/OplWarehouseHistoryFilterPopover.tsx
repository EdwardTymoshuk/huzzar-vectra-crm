'use client'

import DateRangePicker from '@/app/components/DateRangePicker'
import { Button } from '@/app/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'
import { OplWarehouseAction } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

interface OplWarehouseHistoryFilterPopoverProps {
  actions: OplWarehouseAction[] | undefined
  setActions: (v: OplWarehouseAction[] | undefined) => void
  performerId: string | undefined
  setPerformerId: (v: string | undefined) => void
  startDate: Date | undefined
  setStartDate: (v: Date | undefined) => void
  endDate: Date | undefined
  setEndDate: (v: Date | undefined) => void
  locationId: string | undefined
  setLocationId: (v: string | undefined) => void
}

/**
 * OplWarehouseHistoryFilterPopover
 * -------------------------------------------------------------
 * Compact popover for warehouse history filters.
 * Uses external state (no redundant local copies).
 */
const OplWarehouseHistoryFilterPopover = ({
  actions,
  setActions,
  performerId,
  setPerformerId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setLocationId,
}: OplWarehouseHistoryFilterPopoverProps) => {
  const [open, setOpen] = useState(false)

  const { data: performers } = trpc.opl.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  /** Clear all filters and close popover */
  const clearFilters = () => {
    setActions(undefined)
    setPerformerId(undefined)
    setLocationId(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
    setOpen(false)
  }

  /** Helper: wraps filter updates and closes popover */
  const handleChange = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  // Derived values from external state
  const selectedAction = actions?.[0] ?? 'all'
  const selectedPerformer = performerId ?? 'all'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 bg-background space-y-4 p-4">
        {/* Action type */}
        <div>
          <p className="text-sm font-medium mb-1">Typ akcji</p>
          <Select
            value={selectedAction}
            onValueChange={(v) =>
              handleChange(() => {
                setActions(v === 'all' ? undefined : [v as OplWarehouseAction])
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz akcję" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="RECEIVED">Przyjęcie</SelectItem>
              <SelectItem value="ISSUED">Wydanie</SelectItem>
              <SelectItem value="RETURNED">Zwrot</SelectItem>
              <SelectItem value="RETURNED_TO_OPERATOR">
                Zwrot do operatora
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performer */}
        <div>
          <p className="text-sm font-medium mb-1">Wykonawca</p>
          <Select
            value={selectedPerformer}
            onValueChange={(v) =>
              handleChange(() => {
                setPerformerId(v === 'all' ? undefined : v)
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz użytkownika" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {performers?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div>
          <p className="text-sm font-medium mb-1">Zakres dat</p>
          <DateRangePicker
            from={startDate}
            to={endDate}
            setFrom={setStartDate}
            setTo={setEndDate}
          />
        </div>

        {/* Clear filters */}
        <Button variant="ghost" className="w-full" onClick={clearFilters}>
          Wyczyść filtry
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export default OplWarehouseHistoryFilterPopover
