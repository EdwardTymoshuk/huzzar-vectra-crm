'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import TechEarningsMonthlyChart from './TechEarningsMonthlyChart'

type SuccessData =
  | { day: number; successRate: number }
  | { month: number; successRate: number }
  | { year: number; successRate: number }

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  data: {
    total: number
    completed: number
    failed: number
    prevTotal: number
    prevCompleted: number
    prevFailed: number
  }
  successData: SuccessData[]
}

const COLORS = ['#16a34a', '#dc2626']

/**
 * TechOrderStatsSection
 * --------------------------------------------------------------
 * Technician dashboard section:
 * - Pie chart with success KPI,
 * - KPI cards (received, failed, completed),
 * - Success trend chart (day/month/year).
 */
const TechOrderStatsSection = ({ date, range, data, successData }: Props) => {
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

  const { total, completed, failed, prevTotal, prevCompleted, prevFailed } =
    data

  const isAllZero = completed === 0 && failed === 0

  const pieData = isAllZero
    ? [
        { name: 'Wykonane', value: 1 },
        { name: 'Niewykonane', value: 1 },
      ]
    : [
        { name: 'Wykonane', value: completed },
        { name: 'Niewykonane', value: failed },
      ]

  const successRate =
    total > 0 ? Math.round((completed / (completed + failed)) * 100) : 0

  const variant =
    successRate >= 90
      ? 'success'
      : successRate >= 70
      ? 'warning'
      : 'destructive'

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480
  const innerR = isMobile ? 40 : 70
  const outerR = isMobile ? 60 : 100

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-4 h-auto">
      {/* LEFT COLUMN */}
      <div className="flex w-full lg:w-1/3 gap-4 h-full">
        <Card className="flex flex-col items-center justify-center w-full h-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerR}
                outerRadius={outerR}
                label={!isAllZero && !isMobile}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="mb-4 -mt-4">
            <Badge variant={variant}>{successRate}% skuteczność</Badge>
          </div>
        </Card>

        <div className="flex flex-col gap-4 h-full">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Otrzymane</p>
            <p className="text-2xl font-bold">{total}</p>
            {formatChange(percentDiff(total, prevTotal))}
          </Card>

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

      {/* RIGHT COLUMN */}
      <div className="w-full lg:w-2/3 h-auto">
        <TechEarningsMonthlyChart
          date={date}
          range={range}
          data={successData}
        />
      </div>
    </div>
  )
}

export default TechOrderStatsSection
