'use client'

import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { polishMonthsNominative } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
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
  orderType: OplOrderType
}

type DayPoint = { day: number; successRate: number }
type MonthPoint = { month: number; successRate: number }
type YearPoint = { year: number; successRate: number }

const OplSuccessChart = ({ date, range, orderType }: Props) => {
  if (!date) return null

  const { data, isLoading, isError } =
    trpc.opl.order.getCompanySuccessOverTime.useQuery({
      date,
      range,
      orderType,
    })

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
    default: {
      const rows = data as YearPoint[]
      chartData = rows.map((d) => ({
        name: d.year.toString(),
        successRate: d.successRate ?? 0,
      }))
      break
    }
  }

  return (
    <Card className="p-2 w-full h-full">
      <h2 className="text-lg font-semibold mb-4">
        Skuteczność —{' '}
        {range === 'day'
          ? format(date, 'MMMM yyyy', { locale: pl })
          : range === 'month'
          ? date.getFullYear()
          : 'Lata'}
      </h2>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10 }}
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

export default OplSuccessChart
