'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { buildDateParam } from '@/utils/buildDateParam'
import { trpc } from '@/utils/trpc'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

const COLORS = ['#66b266', '#E6262D']

/**
 * Technician Order Stats (compact row layout)
 */
const TechOrderStatsSection = ({ date, range }: Props) => {
  const dateParam = buildDateParam(date, range)

  const { data, isLoading, isError } = trpc.order.getTechOrderStats.useQuery({
    date: dateParam,
    range,
  })

  const formatChange = (value: number) => {
    const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
    const color = value >= 0 ? 'text-success' : 'text-danger'
    return (
      <span className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon className="w-4 h-4" />
        {Math.abs(value)}%
      </span>
    )
  }

  const percentDiff = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować statystyk
      </p>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[220px] w-full" />
        ))}
      </div>
    )
  }

  const { total, completed, failed, prevTotal, prevCompleted, prevFailed } =
    data

  const totalForSuccess = completed + failed
  const successRate =
    totalForSuccess > 0 ? Math.round((completed / totalForSuccess) * 100) : 0

  const variant =
    successRate >= 90
      ? 'success'
      : successRate >= 70
      ? 'warning'
      : 'destructive'

  const pieData = [
    { name: 'Wykonane', value: completed },
    { name: 'Niewykonane', value: failed },
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center justify-center lg:col-span-2">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="my-4 text-center">
            <Badge variant={variant}>{successRate}% skuteczność</Badge>
          </div>
        </Card>
        <div className="grid grid-rows-2 gap-4">
          <Card className="p-4 text-center flex flex-col justify-center items-center">
            <p className="text-sm text-muted-foreground">Wszystkie zlecenia</p>
            <p className="text-4xl font-bold">{total}</p>
            {formatChange(percentDiff(total, prevTotal))}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Niewykonane</p>
              <p className="text-2xl font-bold text-danger">{failed}</p>
              {formatChange(percentDiff(failed, prevFailed))}
            </Card>

            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Wykonane</p>
              <p className="text-2xl font-bold text-success">{completed}</p>
              {formatChange(percentDiff(completed, prevCompleted))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TechOrderStatsSection
