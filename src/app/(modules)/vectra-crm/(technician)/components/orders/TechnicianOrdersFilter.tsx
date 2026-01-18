'use client'

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
import { VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type FilterProps = {
  statusValue: VectraOrderStatus | null
  typeValue: VectraOrderType | null
  setStatusFilterAction: (status: VectraOrderStatus | null) => void
  setOrderTypeFilterAction: (type: VectraOrderType | null) => void
  onClearAction: () => void
}

/**
 * TechnicianOrdersFilter
 * -------------------------------------------------------------
 * Compact popover for filtering technician orders.
 * Auto-closes after selecting or clearing filters.
 */
export const TechnicianOrdersFilter = ({
  statusValue,
  typeValue,
  setStatusFilterAction,
  setOrderTypeFilterAction,
  onClearAction,
}: FilterProps) => {
  const [open, setOpen] = useState(false)

  const statusSelectVal = statusValue ?? 'all'
  const typeSelectVal = typeValue ?? 'all'

  /** Helper: updates filter and closes popover */
  const handleChange = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  /** Clears filters and closes popover */
  const handleClear = () => {
    onClearAction()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="" />{' '}
          <span className="hidden sm:block">Filtruj</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 bg-background space-y-4 p-4">
        {/* Status filter */}
        <div>
          <p className="text-sm font-medium mb-1">Status</p>
          <Select
            value={statusSelectVal as string}
            onValueChange={(value) =>
              handleChange(() =>
                setStatusFilterAction(
                  value === 'all' ? null : (value as VectraOrderStatus)
                )
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="COMPLETED">Wykonane</SelectItem>
              <SelectItem value="NOT_COMPLETED">Niewykonane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type filter */}
        <div>
          <p className="text-sm font-medium mb-1">Typ zlecenia</p>
          <Select
            value={typeSelectVal as string}
            onValueChange={(value) =>
              handleChange(() =>
                setOrderTypeFilterAction(
                  value === 'all' ? null : (value as VectraOrderType)
                )
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="INSTALLATION">Instalacja</SelectItem>
              <SelectItem value="SERVICE">Serwis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        <div className="pt-1">
          <Button variant="ghost" className="w-full" onClick={handleClear}>
            Wyczyść filtry
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
