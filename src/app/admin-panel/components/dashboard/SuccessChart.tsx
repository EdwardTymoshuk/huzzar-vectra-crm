'use client'

import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { polishMonthsNominative } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

/** Strongly-typed result shapes returned by the tRPC endpoint. */
type DayPoint = { day: number; successRate: number }
type MonthPoint = { month: number; successRate: number }
type YearPoint = { year: number; successRate: number }

/**
 * AreaChart showing company-wide success rate over time.
 * - Uses strict type narrowing based on the selected range to avoid union-map issues.
 */
const SuccessChart = ({ date, range }: Props) => {
  // Guard against undefined date to satisfy the tRPC input contract and TS.
  if (!date) return null

  const { data, isLoading, isError } =
    trpc.order.getCompanySuccessOverTime.useQuery(
      { date, range },
      { enabled: true }
    )

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować wykresu skuteczności.
      </p>
    )
  }

  if (isLoading || !data) {
    return <Skeleton className="h-[280px] w-full my-4" />
  }

  /** Build a normalized [{ name, successRate }] array depending on the range. */
  let chartData: Array<{ name: string; successRate: number }>

  switch (range) {
    case 'day': {
      const rows = data as DayPoint[]
      chartData = rows.map((d) => ({
        name: `${d.day}.${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        successRate: d.successRate ?? 0,
      }))
      break
    }
    case 'month': {
      const rows = data as MonthPoint[]
      chartData = rows.map((d) => ({
        name: polishMonthsNominative[d.month - 1],
        successRate: d.successRate ?? 0,
      }))
      break
    }
    case 'year': {
      const rows = data as YearPoint[]
      chartData = rows.map((d) => ({
        name: d.year.toString(),
        successRate: d.successRate ?? 0,
      }))
      break
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">
        Skuteczność firmy —{' '}
        {range === 'day'
          ? format(date, 'MMMM yyyy', { locale: pl })
          : range === 'month'
          ? date.getFullYear()
          : 'Lata'}
      </h2>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip formatter={(v) => [`${v}%`, 'Skuteczność']} />
            <Area
              type="monotone"
              dataKey="successRate"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
              name="Skuteczność"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default SuccessChart
