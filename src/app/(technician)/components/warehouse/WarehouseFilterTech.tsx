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
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setCategoryFilter: (category: string | null) => void
}

/**
 * WarehouseFilterTech
 * ------------------------------------------------------
 * Filter for technician’s warehouse.
 * Displays only categories that exist in the technician’s stock.
 */
const WarehouseFilterTech = ({ setCategoryFilter }: Props) => {
  const [categoryValue, setCategoryValue] = useState('all')

  // ✅ Get technician’s current stock (only categories that exist)
  const { data, isLoading } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
  })

  // Extract unique categories from technician stock
  const availableCategories = useMemo(() => {
    if (!data) return []
    const unique = new Set<string>()
    data.forEach((item) => {
      if (item.category) unique.add(item.category)
    })
    return Array.from(unique)
  }, [data])

  const clearFilters = () => {
    setCategoryValue('all')
    setCategoryFilter(null)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 bg-background space-y-3">
        {/* Category selector */}
        <div>
          <p className="text-sm font-medium mb-1">Kategoria</p>
          <Select
            value={categoryValue}
            onValueChange={(value) => {
              setCategoryValue(value)
              setCategoryFilter(value === 'all' ? null : value)
            }}
          >
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
