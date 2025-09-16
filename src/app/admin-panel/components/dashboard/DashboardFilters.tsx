'use client'

import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { polishMonthsNominative } from '@/lib/constants'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import DatePicker from '../../../components/shared/DatePicker'

type Props = {
  selectedDate: Date | undefined
  onChangeDate: (date: Date | undefined) => void
  range: 'day' | 'month' | 'year'
  onChangeRange: (range: 'day' | 'month' | 'year') => void
}

/**
 * Formats the selected date into a user-friendly label based on the selected range.
 * Uses nominative case for months to avoid grammatical inflections.
 */
const formatLabel = (
  date: Date | undefined,
  range: 'day' | 'month' | 'year'
): string => {
  if (!date) return '—'

  switch (range) {
    case 'day':
      return format(date, 'dd MMMM yyyy', { locale: pl }) // e.g., 15 maja 2025
    case 'month':
      return `${polishMonthsNominative[date.getMonth()]} ${date.getFullYear()}`
    case 'year':
      return date.getFullYear().toString()
  }
}

const DashboardFilters = ({
  selectedDate,
  onChangeDate,
  range,
  onChangeRange,
}: Props) => {
  const label = formatLabel(selectedDate, range)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-4">
      {/* Tabs for selecting range */}
      <div className="flex flex-col gap-2 items-center sm:items-start">
        <Tabs
          value={range}
          onValueChange={(val) => onChangeRange(val as typeof range)}
        >
          <TabsList>
            <TabsTrigger value="day">Dzień</TabsTrigger>
            <TabsTrigger defaultChecked value="month">
              Miesiąc
            </TabsTrigger>
            <TabsTrigger value="year">Rok</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm text-center sm:text-left">
          Wybrany zakres:{' '}
          <span className="font-medium text-primary">{label}</span>
        </p>
      </div>

      {/* Calendar based on selected range */}
      <DatePicker
        selected={selectedDate}
        onChange={onChangeDate}
        range={range}
      />
    </div>
  )
}

export default DashboardFilters
