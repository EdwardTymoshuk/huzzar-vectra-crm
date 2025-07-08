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
import { trpc } from '@/utils/trpc'
import { OrderStatus, OrderType } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

/**
 * OrdersFilter component:
 * - Displays filtering options inside a popover.
 * - Allows filtering by status and assigned technician.
 */
const OrdersFilter = ({
  setStatusFilter,
  setTechnicianFilter,
  setOrderTypeFilter,
}: {
  setStatusFilter: (status: OrderStatus | null) => void
  setTechnicianFilter: (technician: string | null) => void
  setOrderTypeFilter: (type: OrderType | null) => void
}) => {
  const [statusFilter, setStatusFilterState] = useState<string | null>(null)
  const [technicianFilter, setTechnicianFilterState] = useState<string | null>(
    null
  )

  const { data: technicians } = trpc.user.getTechnicians.useQuery()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-background">
        <p className="text-sm font-medium mt-4 mb-2">
          Filtruj po typie zlecenia
        </p>
        <Select
          onValueChange={(value) => {
            setOrderTypeFilter(value === 'all' ? null : (value as OrderType))
          }}
          defaultValue="all"
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Typ zlecenia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="INSTALATION">Instalacja</SelectItem>
            <SelectItem value="SERVICE">Serwis</SelectItem>
            <SelectItem value="OUTAGE">Awaria</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm font-medium mb-2">Filtruj po statusie</p>
        <Select
          onValueChange={(value) => {
            setStatusFilterState(value === 'all' ? null : value)
            setStatusFilter(value === 'all' ? null : (value as OrderStatus))
          }}
          value={statusFilter || 'all'}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Wybierz status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="PENDING">Nie przypisane</SelectItem>
            <SelectItem value="ASSIGNED">Przypisane</SelectItem>
            <SelectItem value="IN_PROGRESS">W trakcie</SelectItem>
            <SelectItem value="COMPLETED">Wykonane</SelectItem>
            <SelectItem value="NOT_COMPLETED">Niewykonane</SelectItem>
            <SelectItem value="CANCELED">Wycofane</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm font-medium mt-4 mb-2">Filtruj po techniku</p>
        <Select
          onValueChange={(value) => {
            setTechnicianFilterState(value === 'all' ? null : value)
            setTechnicianFilter(value === 'all' ? null : value)
          }}
          value={technicianFilter || 'all'}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Wybierz technika" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy</SelectItem>
            {technicians?.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  )
}

export default OrdersFilter
