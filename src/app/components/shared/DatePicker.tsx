'use client'

import { Button } from '@/app/components/ui/button'
import { Calendar } from '@/app/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { polishMonthsNominative } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'
import { FaClockRotateLeft, FaRegClock } from 'react-icons/fa6'
import { MdCalendarToday } from 'react-icons/md'

type Props = {
  selected: Date | undefined
  onChange: (date: Date | undefined) => void
  range: 'day' | 'month' | 'year'
  fullWidth?: boolean
  allowFuture?: boolean // allows future dates if true
}

/** * DatePicker with smart mode switching (day, month, year). * Uses custom month/year grid instead of default dropdowns. */

const DatePicker = ({
  selected,
  onChange,
  range,
  fullWidth,
  allowFuture = false,
}: Props) => {
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [yearViewOffset, setYearViewOffset] = useState(0)

  // Returns true if given date is after today and future is disallowed
  const isDisabled = (date: Date) => !allowFuture && date > today

  // Normalize date for selected range
  const normalize = (date: Date) => {
    if (range === 'month')
      return new Date(date.getFullYear(), date.getMonth(), 1)
    if (range === 'year') return new Date(date.getFullYear(), 0, 1)
    return date
  }

  const handleSelect = (date: Date) => {
    const normalized = normalize(date)
    if (isDisabled(normalized)) return
    onChange(normalized)
    setOpen(false)
  }

  // Renders 12 months of current year
  const renderMonthGrid = () => {
    const months = Array.from(
      { length: 12 },
      (_, i) => new Date(today.getFullYear(), i, 1)
    )
    return (
      <div className="grid grid-cols-3 gap-2">
        {months.map((month) => (
          <Button
            key={month.toISOString()}
            variant="outline"
            onClick={() => handleSelect(month)}
            disabled={isDisabled(month)}
          >
            {format(month, 'LLLL', { locale: pl })}
          </Button>
        ))}
      </div>
    )
  }

  // Renders 12 years grid with offset
  const renderYearGrid = () => {
    const base = today.getFullYear() - 5 + yearViewOffset * 12
    const years = Array.from({ length: 12 }, (_, i) => base + i)
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setYearViewOffset((v) => v - 1)}
          >
            ‹
          </Button>
          <p className="text-sm text-muted-foreground">
            {years[0]} - {years[11]}
          </p>
          <Button
            variant="ghost"
            onClick={() => setYearViewOffset((v) => v + 1)}
          >
            ›
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {years.map((year) => {
            const date = new Date(year, 0, 1)
            return (
              <Button
                key={year}
                variant="outline"
                onClick={() => handleSelect(date)}
                disabled={isDisabled(date)}
              >
                {year}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'flex items-center gap-2',
            fullWidth ? 'w-full justify-center' : 'w-fit'
          )}
        >
          <MdCalendarToday className="w-5 h-5" />
          {selected
            ? range === 'day'
              ? format(selected, 'dd.MM.yyyy')
              : range === 'month'
              ? `${
                  polishMonthsNominative[selected.getMonth()]
                } ${selected.getFullYear()}`
              : `${selected.getFullYear()}`
            : 'Wybierz datę'}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-2 space-y-2 bg-background border border-border shadow-md rounded-md">
        {range === 'day' && (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && handleSelect(d)}
            disabled={isDisabled}
            defaultMonth={selected ?? today}
            captionLayout="buttons"
            fromYear={today.getFullYear() - 5}
            toYear={
              allowFuture ? today.getFullYear() + 50 : today.getFullYear()
            }
          />
        )}

        {range === 'month' && renderMonthGrid()}
        {range === 'year' && renderYearGrid()}

        {range !== 'year' && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onChange(subDays(today, 1))
                setOpen(false)
              }}
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
            >
              <FaClockRotateLeft /> Wczoraj
            </Button>
            <Button
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
            >
              <FaRegClock /> Dzisiaj
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
