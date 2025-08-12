'use client'

import { Card } from '@/app/components/ui/card'
import { Progress } from '@/app/components/ui/progress'
import { Skeleton } from '@/app/components/ui/skeleton'
import { buildDateParam } from '@/utils/buildDateParam'
import { trpc } from '@/utils/trpc'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

/** Maps internal range to Polish label for UI */
const rangeLabelMap: Record<Props['range'], string> = {
  day: 'dzień',
  month: 'miesiąc',
  year: 'rok',
}

/**
 * Technician earnings KPIs
 * - current/previous amounts
 * - % change with arrow
 * - goal progress with colored Indicator (track stays muted)
 */
const TechEarningsKpis = ({ date, range }: Props) => {
  const dateParam = buildDateParam(date, range)

  // TODO: swap to trpc.reports.getTechEarningsKpis if that's your final namespace
  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
  } = trpc.order.getTechEarningsKpis.useQuery(
    { date: dateParam, range },
    { onError: (e) => console.error('getTechEarningsKpis error:', e) }
  )

  // TODO: swap to trpc.settings.getGoals if that's your final namespace
  const {
    data: goals,
    isLoading: goalsLoading,
    isError: goalsError,
  } = trpc.user.getGoals.useQuery(undefined, { retry: 1 })

  // Render up/down change with icon and color
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

  // Error first
  if (kpisError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować statystyk
      </p>
    )
  }

  if (kpisLoading || !kpis || goalsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
    )
  }

  // Compute goal target for current range
  const monthlyGoal = goals?.revenueGoal ?? 0
  const workingDays = goals?.workingDaysGoal ?? 0

  const goalTarget =
    range === 'month'
      ? monthlyGoal
      : range === 'day'
      ? workingDays > 0
        ? monthlyGoal / workingDays
        : 0
      : monthlyGoal * 12

  // Progress % with clamping
  const rawPct = goalTarget > 0 ? (kpis.amount / goalTarget) * 100 : 0
  const progressPct = Math.min(Math.max(rawPct, 0), 100)

  // Treat near-zero as zero to avoid accidental 'danger' on tiny amounts
  const isZeroProgress =
    goalTarget <= 0 || kpis.amount <= 0 || progressPct < 0.5

  // Indicator color only; track stays muted in Progress component
  const indicatorClassName = isZeroProgress
    ? 'bg-muted'
    : progressPct < 60
    ? 'bg-danger'
    : progressPct < 100
    ? 'bg-warning'
    : 'bg-success'

  const label = rangeLabelMap[range]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {/* Current period earnings */}
      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Zarobek ({label})</p>
        <p className="text-3xl font-bold text-primary">
          {kpis.amount.toFixed(2)} zł
        </p>
      </Card>

      {/* Previous period earnings */}
      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Poprzedni okres</p>
        <p className="text-2xl font-semibold">
          {kpis.prevAmount.toFixed(2)} zł
        </p>
      </Card>

      {/* Period-over-period delta */}
      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Zmiana vs poprzedni</p>
        {formatChange(kpis.changePct)}
      </Card>

      {/* Goal progress */}
      <Card className="p-4 flex flex-col gap-2 justify-center">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Cel ({label})</p>
          <span className="text-sm font-medium">
            {goalTarget.toFixed(2)} zł
          </span>
        </div>

        {/* Track is muted in component; only the bar is colored */}
        <Progress value={progressPct} indicatorClassName={indicatorClassName} />

        <div className="flex items-center justify-between text-sm">
          <span>Postęp</span>
          <span className="font-medium">{progressPct.toFixed(0)}%</span>
        </div>

        {/* Gentle hints */}
        {(!goals || monthlyGoal === 0) && !goalsError && (
          <p className="text-xs text-muted-foreground mt-1">
            Ustal cel w ustawieniach, aby śledzić postęp.
          </p>
        )}
        {goalsError && (
          <p className="text-xs text-destructive mt-1">
            Nie udało się pobrać celu. Spróbuj ponownie później.
          </p>
        )}
      </Card>
    </div>
  )
}

export default TechEarningsKpis
