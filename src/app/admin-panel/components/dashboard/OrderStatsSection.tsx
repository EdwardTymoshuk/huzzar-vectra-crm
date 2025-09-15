'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { buildDateParam } from '@/utils/dates/buildDateParam'
import { trpc } from '@/utils/trpc'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

const COLORS = ['#16a34a', '#dc2626'] // zielony, czerwony

const OrderStatsSection = ({ date, range }: Props) => {
  const dateParam = buildDateParam(date, range)

  const { data, isLoading, isError } = trpc.order.getOrderStats.useQuery({
    date: dateParam,
    range,
  })

  // Render change indicator with icon and color
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

  // Calculate percentage difference between current and previous value
  const percentDiff = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować statystyk zleceń.
      </p>
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
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* PieChart with success rate badge */}
        <Card className="flex flex-col items-center justify-center md:col-span-2">
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

        {/* Total orders */}
        <Card className="p-4 text-center flex flex-col justify-center items-center md:col-span-2">
          <p className="text-sm text-muted-foreground mb-1">
            Wszystkie zlecenia
          </p>
          <p className="text-4xl font-bold">{total}</p>
          {formatChange(percentDiff(total, prevTotal))}
        </Card>

        {/* Completed and failed orders */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Wykonane</p>
            <p className="text-2xl font-bold text-success">{completed}</p>
            {formatChange(percentDiff(completed, prevCompleted))}
          </Card>

          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Niewykonane</p>
            <p className="text-2xl font-bold text-danger">{failed}</p>
            {formatChange(percentDiff(failed, prevFailed))}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OrderStatsSection
