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
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { MdFilterList } from 'react-icons/md'

type Props = {
  setTechnicianFilter: (technicianOrTeam: string | null) => void
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
  setTechnicianFilter,
  setDateFrom,
  setDateTo,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [technicianValue, setTechnicianValue] = useState<string>('all')
  const [dateFromValue, setDateFromValue] = useState<Date | undefined>(
    undefined
  )
  const [dateToValue, setDateToValue] = useState<Date | undefined>(undefined)

  const { data: technicians } = trpc.opl.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })
  const { data: teams } = trpc.opl.user.getTeams.useQuery({ activeOnly: true })

  /** Helper: updates filter and closes popover */
  const handleChange = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  /** Clears filters and closes popover */
  const clearFilters = () => {
    setTechnicianValue('all')
    setDateFromValue(undefined)
    setDateToValue(undefined)
    setTechnicianFilter(null)
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
        {/* Technician / Team */}
        <div>
          <p className="text-sm font-medium mb-1">Technik / Ekipa</p>
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
              <SelectValue placeholder="Wybierz technika lub ekipę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {!!teams?.length && (
                <>
                  {teams.map((team) => (
                    <SelectItem key={`team-${team.id}`} value={`team:${team.id}`}>
                      {team.name}
                    </SelectItem>
                  ))}
                </>
              )}
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
