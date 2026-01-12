'use client'

import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
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
import { VectraDeviceCategory } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setCategoryFilter: (category: string | null) => void
}

/**
 * WarehouseFilter
 * -------------------------------------------------------------
 * Provides filtering by VectraDeviceCategory (from Prisma enum).
 * Automatically closes after selecting or clearing filters.
 */
const WarehouseFilter = ({ setCategoryFilter }: Props) => {
  const [open, setOpen] = useState(false)
  const [categoryValue, setCategoryValue] = useState<string>('all')

  /** Updates filter and closes popover */
  const handleChange = (value: string) => {
    setCategoryValue(value)
    setCategoryFilter(value === 'all' ? null : value)
    setOpen(false)
  }

  /** Clears filters and closes popover */
  const clearFilters = () => {
    setCategoryValue('all')
    setCategoryFilter(null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 bg-background space-y-3 p-4">
        {/* Category */}
        <div>
          <p className="text-sm font-medium mb-1">Kategoria</p>
          <Select value={categoryValue} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {Object.values(VectraDeviceCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {devicesTypeMap[cat] ?? cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        <div className="pt-1">
          <Button variant="ghost" className="w-full" onClick={clearFilters}>
            Wyczyść filtry
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default WarehouseFilter
