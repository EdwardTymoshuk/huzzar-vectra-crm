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
import { VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setStatusFilter: (status: VectraOrderStatus | null) => void
  setTechnicianFilter: (technician: string | null) => void
  setOrderTypeFilter: (type: VectraOrderType | null) => void
}

/**
 * OrdersFilter
 * -------------------------------------------------------------
 * Popover filter for admin/coordinator orders list.
 * Automatically closes after selecting or clearing filters.
 */
const OrdersFilter = ({
  setStatusFilter,
  setTechnicianFilter,
  setOrderTypeFilter,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [statusValue, setStatusValue] = useState<string>('all')
  const [technicianValue, setTechnicianValue] = useState<string>('all')
  const [typeValue, setTypeValue] = useState<string>('all')

  const { data: technicians } = trpc.vectra.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  /** Helper: updates filter and closes popover */
  const handleChange = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  /** Clears filters and closes popover */
  const clearFilters = () => {
    setStatusValue('all')
    setTechnicianValue('all')
    setTypeValue('all')
    setStatusFilter(null)
    setTechnicianFilter(null)
    setOrderTypeFilter(null)
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
        {/* Order type */}
        <div>
          <p className="text-sm font-medium mb-1">Typ zlecenia</p>
          <Select
            value={typeValue}
            onValueChange={(value) =>
              handleChange(() => {
                setTypeValue(value)
                setOrderTypeFilter(
                  value === 'all' ? null : (value as VectraOrderType)
                )
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Typ zlecenia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="INSTALLATION">Instalacja</SelectItem>
              <SelectItem value="SERVICE">Serwis</SelectItem>
              <SelectItem value="OUTAGE">Awaria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <p className="text-sm font-medium mb-1">Status</p>
          <Select
            value={statusValue}
            onValueChange={(value) =>
              handleChange(() => {
                setStatusValue(value)
                setStatusFilter(
                  value === 'all' ? null : (value as VectraOrderStatus)
                )
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="COMPLETED">Wykonane</SelectItem>
              <SelectItem value="NOT_COMPLETED">Niewykonane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Technician */}
        <div>
          <p className="text-sm font-medium mb-1">Technik</p>
          <Select
            value={technicianValue}
            onValueChange={(value) =>
              handleChange(() => {
                setTechnicianValue(value)
                setTechnicianFilter(value === 'all' ? null : value)
              })
            }
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

export default OrdersFilter
