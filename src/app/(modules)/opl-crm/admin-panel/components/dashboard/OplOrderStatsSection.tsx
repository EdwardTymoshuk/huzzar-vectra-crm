'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { buildDateParam } from '@/utils/dates/buildDateParam'
import { resolveDateRange } from '@/utils/dates/resolveDateRange'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import OplInProgressOrdersDialog from './OplInProgressOrdersDialog'
import OplSuccessChart from './OplSuccessChart'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OplOrderType
}

const COLORS = ['#16a34a', '#dc2626']

const OplOrderStatsSection = ({ date, range, orderType }: Props) => {
  const [openDialog, setOpenDialog] = useState(false)
  const dateParam = buildDateParam(date, range)
  const { dateFrom, dateTo } = resolveDateRange(date, range)

  const { data, isLoading, isError } = trpc.opl.order.getOrderStats.useQuery({
    date: dateParam,
    range,
    orderType,
  })

  const formatChange = (val: number) => {
    const Icon = val >= 0 ? ArrowUpRight : ArrowDownRight
    const color = val >= 0 ? 'text-success' : 'text-danger'
    return (
      <span className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon className="w-4 h-4" />
        {Math.abs(val)}%
      </span>
    )
  }

  const percentDiff = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  if (isLoading || !data) {
    return <Skeleton className="h-[300px] w-full my-6" />
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować statystyk zleceń.
      </p>
    )
  }

  const {
    total,
    completed,
    failed,
    prevTotal,
    prevCompleted,
    prevFailed,
    inProgress,
    prevInProgress,
  } = data

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const variant =
    successRate >= 90
      ? 'success'
      : successRate >= 70
      ? 'warning'
      : 'destructive'

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480
  const innerR = isMobile ? 40 : 70
  const outerR = isMobile ? 60 : 100

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-4 h-auto">
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

        <div className="flex flex-col gap-3 h-full">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Otrzymane</p>
            <p className="text-2xl font-bold">{total}</p>
            {formatChange(percentDiff(total, prevTotal))}
          </Card>

          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Wykonane</p>
            <p className="text-xl font-bold text-success">{completed}</p>
            {formatChange(percentDiff(completed, prevCompleted))}
          </Card>

          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Niewykonane</p>
            <p className="text-xl font-bold text-danger">{failed}</p>
            {formatChange(percentDiff(failed, prevFailed))}
          </Card>

          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">W realizacji</p>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    className="text-xl font-bold text-primary cursor-pointer underline"
                    onClick={() => setOpenDialog(true)}
                  >
                    {inProgress}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  Kliknij, aby zobaczyć zlecenia w realizacji
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {formatChange(percentDiff(inProgress, prevInProgress))}
          </Card>
        </div>
      </div>

      <div className="w-full lg:w-2/3 h-auto">
        <OplSuccessChart date={date} range={range} orderType={orderType} />
      </div>

      <OplInProgressOrdersDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        orderType={orderType}
      />
    </div>
  )
}

export default OplOrderStatsSection
