'use client'

import { Card } from '@/app/components/ui/card'
import { polishMonthsNominative } from '@/lib/constants'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type SuccessRow =
  | { day: number; successRate: number }
  | { month: number; successRate: number }
  | { year: number; successRate: number }

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  data: SuccessRow[] | undefined
}

/**
 * TechSuccessChart (clean, data-only)
 */
const TechEarningsMonthlyChart = ({ date, range, data }: Props) => {
  const selectedDate = date ?? new Date()
  const year = selectedDate.getFullYear()
  const monthIndex = selectedDate.getMonth()
  const monthName = polishMonthsNominative[monthIndex]

  /** Build proper title depending on active time range */
  const getTitle = () => {
    if (range === 'day') {
      return `Skuteczność — miesiąc ${monthName} ${year}`
    }
    if (range === 'month') {
      return `Skuteczność — rok ${year}`
    }
    return 'Skuteczność ogólna'
  }

  // Transform dataset for chart
  let mapped: Array<{ label: string; successRate: number }> = []

  if (range === 'day') {
    mapped = (data as { day: number; successRate: number }[]).map((row) => ({
      label: `${row.day}`,
      successRate: row.successRate,
    }))
  } else if (range === 'month') {
    mapped = (data as { month: number; successRate: number }[]).map((row) => ({
      label: polishMonthsNominative[row.month - 1],
      successRate: row.successRate,
    }))
  } else {
    mapped = (data as { year: number; successRate: number }[]).map((row) => ({
      label: `${row.year}`,
      successRate: row.successRate,
    }))
  }

  return (
    <Card className="p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">{getTitle()}</h2>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mapped}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Skuteczność']}
            />

            <Area
              type="monotone"
              dataKey="successRate"
              name="Skuteczność"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default TechEarningsMonthlyChart
