// components/shared/DateRangePicker.tsx
'use client'

/**
 * DateRangePicker – two-month range selector.
 */

import { Button } from '@/app/components/ui/button'
import { Calendar } from '@/app/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

type Props = {
  from: Date | undefined
  to: Date | undefined
  setFrom: (date: Date | undefined) => void
  setTo: (date: Date | undefined) => void
}

const DateRangePicker = ({ from, to, setFrom, setTo }: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn(
            /* w-full on mobile, 260 px on desktop */
            'w-full md:w-[260px] justify-start text-left font-normal',
            !from && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {from && to ? (
            <>
              {format(from, 'dd.MM.yyyy', { locale: pl })} –{' '}
              {format(to, 'dd.MM.yyyy', { locale: pl })}
            </>
          ) : (
            <span>Wybierz zakres dat</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            setFrom(range?.from)
            setTo(range?.to)
          }}
          numberOfMonths={2}
          locale={pl}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker
