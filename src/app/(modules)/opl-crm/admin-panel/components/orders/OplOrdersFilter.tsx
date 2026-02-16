'use client'

import { Button } from '@/app/components/ui/button'
import DateRangePicker from '@/app/components/DateRangePicker'
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
import { OplOrderStatus, OplOrderType } from '@prisma/client'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setStatusFilter: (status: OplOrderStatus | null) => void
  setTechnicianFilter: (technician: string | null) => void
  setOrderTypeFilter: (type: OplOrderType | null) => void
  setDateFrom: (date: string | null) => void
  setDateTo: (date: string | null) => void
}

/**
 * OplOrdersFilter
 * -------------------------------------------------------------
 * Popover filter for admin/coordinator orders list.
 * Automatically closes after selecting or clearing filters.
 */
const OplOrdersFilter = ({
  setStatusFilter,
  setTechnicianFilter,
  setOrderTypeFilter,
  setDateFrom,
  setDateTo,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [statusValue, setStatusValue] = useState<string>('all')
  const [technicianValue, setTechnicianValue] = useState<string>('all')
  const [typeValue, setTypeValue] = useState<string>('all')
  const [dateFromValue, setDateFromValue] = useState<Date | undefined>(
    undefined
  )
  const [dateToValue, setDateToValue] = useState<Date | undefined>(undefined)

  const { data: technicians } = trpc.opl.user.getTechnicians.useQuery({
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
    setDateFromValue(undefined)
    setDateToValue(undefined)
    setStatusFilter(null)
    setTechnicianFilter(null)
    setOrderTypeFilter(null)
    setDateFrom(null)
    setDateTo(null)
    setOpen(false)
  }

  useEffect(() => {
    if (!dateFromValue && !dateToValue) {
      setDateFrom(null)
      setDateTo(null)
      return
    }

    if (dateFromValue && !dateToValue) {
      const day = format(dateFromValue, 'yyyy-MM-dd')
      // Single day filter (no range selected yet).
      setDateFrom(day)
      setDateTo(day)
      return
    }

    if (dateFromValue && dateToValue) {
      setDateFrom(format(dateFromValue, 'yyyy-MM-dd'))
      setDateTo(format(dateToValue, 'yyyy-MM-dd'))
    }
  }, [dateFromValue, dateToValue, setDateFrom, setDateTo])

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
                  value === 'all' ? null : (value as OplOrderType)
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
                  value === 'all' ? null : (value as OplOrderStatus)
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

        {/* Date range */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Data realizacji</p>
          <DateRangePicker
            from={dateFromValue}
            to={dateToValue}
            setFrom={setDateFromValue}
            setTo={setDateToValue}
          />
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

export default OplOrdersFilter
