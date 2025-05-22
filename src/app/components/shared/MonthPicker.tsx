'use client'

import { Button } from '@/app/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { polishMonthsNominative } from '@/lib/constants'
import { useState } from 'react'
import { MdCalendarMonth } from 'react-icons/md'

type Props = {
  selected: Date
  onChange: (date: Date) => void
}

const MonthPicker = ({ selected, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(selected.getFullYear())

  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
  const today = new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MdCalendarMonth />
          {polishMonthsNominative[selected.getMonth()]} {selected.getFullYear()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 space-y-4 bg-background">
        {/* Year navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setYear((y) => y - 1)}
          >
            ‹
          </Button>
          <span className="font-medium">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setYear((y) => y + 1)}
          >
            ›
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => {
            const isDisabled = month > today
            const isSelected =
              month.getFullYear() === selected.getFullYear() &&
              month.getMonth() === selected.getMonth()

            return (
              <Button
                key={month.toISOString()}
                variant={isSelected ? 'default' : 'outline'}
                disabled={isDisabled}
                onClick={() => {
                  onChange(new Date(month.getFullYear(), month.getMonth(), 1))
                  setOpen(false)
                }}
                className="text-sm"
                aria-current={isSelected ? 'date' : undefined}
              >
                {polishMonthsNominative[month.getMonth()]} {year}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MonthPicker
