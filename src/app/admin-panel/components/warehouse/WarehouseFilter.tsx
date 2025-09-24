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
import { DeviceCategory, DeviceProvider } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setCategoryFilter: (category: string | null) => void
  setProviderFilter: (provider: string | null) => void
}

/**
 * WarehouseFilter:
 * - Provides filtering by DeviceCategory and DeviceProvider.
 * - Options are always taken from schema enums (not from data),
 *   so filters remain available even if no items exist in table.
 */
const WarehouseFilter = ({ setCategoryFilter, setProviderFilter }: Props) => {
  const [categoryValue, setCategoryValue] = useState<string>('all')
  const [providerValue, setProviderValue] = useState<string>('all')

  const clearFilters = () => {
    setCategoryValue('all')
    setProviderValue('all')
    setCategoryFilter(null)
    setProviderFilter(null)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 bg-background space-y-3">
        {/* Category */}
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
              <SelectValue placeholder="Kategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {Object.values(DeviceCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {devicesTypeMap[cat] ?? cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider */}
        <div>
          <p className="text-sm font-medium mb-1">Operator</p>
          <Select
            value={providerValue}
            onValueChange={(value) => {
              setProviderValue(value)
              setProviderFilter(value === 'all' ? null : value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {Object.values(DeviceProvider).map((prov) => (
                <SelectItem key={prov} value={prov}>
                  {prov}
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

export default WarehouseFilter
