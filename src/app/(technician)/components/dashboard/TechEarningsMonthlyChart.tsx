'use client'

import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { polishMonthsNominative } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import {
  Area,
  AreaChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts'

type Props = { year: number }

/**
 * Area chart: Amount (PLN, left axis) + Success rate (%, right axis)
 * - Both as areas for visual consistency.
 */
const TechEarningsMonthlyChart = ({ year }: Props) => {
  const { data, isLoading, isError } =
    trpc.order.getTechEarningsByMonth.useQuery(
      { year },
      {
        enabled: Number.isInteger(year) && year > 2000 && year < 2100,
      }
    )

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować statystyk.
      </p>
    )
  }

  if (isLoading || !data) {
    return <Skeleton className="h-[280px] w-full my-4" />
  }

  // Typed formatter matching the inferred Tooltip generics:
  // TValue = number, TName = 'Zarobek' | 'Skuteczność'
  const tooltipFormatter: TooltipProps<
    number,
    'Zarobek' | 'Skuteczność'
  >['formatter'] = (val, name) => {
    if (name === 'Skuteczność') {
      // success rate is already 0–100
      return [`${val}%`, name]
    }
    // earnings
    return [`${(val as number).toFixed(2)} zł`, name]
  }

  const chartData = data.map((row) => ({
    name: polishMonthsNominative[row.month - 1] ?? `M-${row.month}`,
    amount: row.amount,
    successRate: row.successRate ?? 0, // 0–100
  }))

  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground mb-2">
        Zarobki i skuteczność — {year}
      </p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="amount"
              name="Zarobek"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="successRate"
              name="Skuteczność"
              stroke="hsl(var(--secondary))"
              fill="hsl(var(--secondary) / 0.2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default TechEarningsMonthlyChart
