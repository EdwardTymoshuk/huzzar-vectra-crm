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
import { trpc } from '@/utils/trpc'
import { VectraDeviceCategory } from '@prisma/client'
import { useMemo, useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setCategoryFilter: (category: VectraDeviceCategory | null) => void
}

type CategoryFilterValue = 'all' | VectraDeviceCategory

/**
 * WarehouseFilterTech
 * ------------------------------------------------------
 * Filter for technician’s warehouse.
 * Displays only categories that exist in the technician’s stock.
 * Automatically closes after selection or clearing.
 */
const WarehouseFilterTech = ({ setCategoryFilter }: Props) => {
  const [open, setOpen] = useState(false)
  const [categoryValue, setCategoryValue] = useState<CategoryFilterValue>('all')

  // ✅ Get technician’s current stock (only categories that exist)
  const { data, isLoading } = trpc.vectra.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: 'self',
    }
  )

  // Extract unique categories from technician stock
  const availableCategories = useMemo(() => {
    if (!data) return []
    const unique = new Set<VectraDeviceCategory>()
    data.forEach((item) => {
      if (item.category) unique.add(item.category)
    })
    return Array.from(unique)
  }, [data])

  /** Helper: updates filter and closes popover */
  const handleChange = (value: CategoryFilterValue) => {
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
        <Button variant="outline" disabled={isLoading}>
          <MdFilterList className="" />{' '}
          <span className="hidden sm:block">Filtruj</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 bg-background space-y-3 p-4">
        {/* Category selector */}
        <div>
          <p className="text-sm font-medium mb-1">Kategoria</p>
          <Select value={categoryValue} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz kategorię" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {devicesTypeMap[cat] ?? cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1">
          <Button variant="ghost" className="w-full" onClick={clearFilters}>
            Wyczyść filtry
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default WarehouseFilterTech
