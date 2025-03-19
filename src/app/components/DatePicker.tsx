'use client'

import { Button } from '@/app/components/ui/button'
import { Calendar } from '@/app/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'
import { MdCalendarToday } from 'react-icons/md'

/**
 * DatePicker component:
 * - Allows selecting a date.
 * - Uses Popover & Calendar for UI consistency.
 * - Closes the calendar after a date is selected.
 */
interface DatePickerProps {
  selected: Date | undefined
  onChange: (date: Date | undefined) => void
}

const DatePicker: React.FC<DatePickerProps> = ({ selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MdCalendarToday className="w-5 h-5" />
          {selected
            ? format(selected, 'dd MMMM yyyy', { locale: pl })
            : 'Wybierz datę'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            onChange(day ?? undefined)
            setIsOpen(false) // Close the calendar popover after selecting a date.
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
