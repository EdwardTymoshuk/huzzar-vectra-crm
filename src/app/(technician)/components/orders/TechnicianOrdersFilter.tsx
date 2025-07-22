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
import { OrderStatus, OrderType } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

const TechnicianOrdersFilter = ({
  setStatusFilter,
  setOrderTypeFilter,
}: {
  setStatusFilter: (status: OrderStatus | null) => void
  setOrderTypeFilter: (type: OrderType | null) => void
}) => {
  const [status, setStatus] = useState<string | null>('all')
  const [type, setType] = useState<string | null>('all')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-background space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Status</p>
          <Select
            value={status || 'all'}
            onValueChange={(value) => {
              setStatus(value)
              setStatusFilter(value === 'all' ? null : (value as OrderStatus))
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="COMPLETED">Wykonane</SelectItem>
              <SelectItem value="NOT_COMPLETED">Niewykonane</SelectItem>
              <SelectItem value="ASSIGNED">Przypisane</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Typ zlecenia</p>
          <Select
            value={type || 'all'}
            onValueChange={(value) => {
              setType(value)
              setOrderTypeFilter(value === 'all' ? null : (value as OrderType))
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="INSTALATION">Instalacja</SelectItem>
              <SelectItem value="SERVICE">Serwis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default TechnicianOrdersFilter
