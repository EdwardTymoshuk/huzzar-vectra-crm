'use client'

import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { OplOrderType } from '@prisma/client'
import { trpc } from '@/utils/trpc'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Props = {
  orderType: OplOrderType
}

const OplCompletedMonthlyTypeChart = ({ orderType }: Props) => {
  const { data, isLoading, isError } =
    trpc.opl.order.getCompletedMonthlyVolumeAllTime.useQuery()

  if (isLoading) {
    return <Skeleton className="h-[320px] w-full my-4" />
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować wykresu miesięcznego.
      </p>
    )
  }

  const key = orderType === OplOrderType.INSTALLATION ? 'installations' : 'services'
  const successKey =
    orderType === OplOrderType.INSTALLATION
      ? 'installationsSuccessRate'
      : 'servicesSuccessRate'
  const title =
    orderType === OplOrderType.INSTALLATION
      ? 'Wykonane instalacje miesięcznie (cały okres)'
      : 'Wykonane serwisy miesięcznie (cały okres)'
  const lineColor = orderType === OplOrderType.INSTALLATION ? '#2563eb' : '#f97316'
  const lineName = orderType === OplOrderType.INSTALLATION ? 'Instalacje' : 'Serwisy'

  const chartData = data.map((row) => {
    const [year, month] = row.month.split('-')
    return {
      ...row,
      monthLabel: `${month}.${year}`,
    }
  })

  return (
    <Card className="p-4 mt-3">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 10 }}
              minTickGap={24}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value, name) => {
                if (name === 'Skuteczność') return [`${value}%`, name]
                return [value, name]
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={key}
              name={lineName}
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={successKey}
              name="Skuteczność"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default OplCompletedMonthlyTypeChart
