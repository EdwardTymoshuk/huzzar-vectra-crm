'use client'

import { Card } from '@/app/components/ui/card'
import { Progress } from '@/app/components/ui/progress'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

type Props = {
  date?: Date
  range: 'day' | 'month' | 'year'
  data: {
    amount: number
    prevAmount: number
    changePct: number
  }
  goals: {
    revenueGoal: number
    workingDaysGoal: number
  } | null
}

const rangeLabelMap: Record<Props['range'], string> = {
  day: 'dzień',
  month: 'miesiąc',
  year: 'rok',
}

const OplTechEarningsKpis = ({ date, range, data, goals }: Props) => {
  const { amount, prevAmount, changePct } = data
  const selectedDate = date ?? new Date()

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

  const rawPct = goalTarget > 0 ? (amount / goalTarget) * 100 : 0
  const progressPct = Math.min(Math.max(rawPct, 0), 100)
  const isZeroProgress = goalTarget <= 0 || amount <= 0 || progressPct < 0.5

  const indicatorClassName = isZeroProgress
    ? 'bg-muted'
    : progressPct < 60
      ? 'bg-danger'
      : progressPct < 100
        ? 'bg-warning'
        : 'bg-success'

  const label = rangeLabelMap[range]

  const getElapsedDays = () => {
    if (range === 'day') return 1

    if (range === 'month') {
      const now = new Date()
      const isCurrentMonth =
        now.getFullYear() === selectedDate.getFullYear() &&
        now.getMonth() === selectedDate.getMonth()
      if (!isCurrentMonth) {
        return new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          0
        ).getDate()
      }
      return now.getDate()
    }

    const now = new Date()
    const isCurrentYear = now.getFullYear() === selectedDate.getFullYear()
    if (!isCurrentYear) {
      const isLeap =
        selectedDate.getFullYear() % 4 === 0 &&
        (selectedDate.getFullYear() % 100 !== 0 ||
          selectedDate.getFullYear() % 400 === 0)
      return isLeap ? 366 : 365
    }

    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const diffMs = now.getTime() - startOfYear.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
  }

  const getTotalDays = () => {
    if (range === 'day') return 1
    if (range === 'month') {
      return new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
      ).getDate()
    }
    const isLeap =
      selectedDate.getFullYear() % 4 === 0 &&
      (selectedDate.getFullYear() % 100 !== 0 ||
        selectedDate.getFullYear() % 400 === 0)
    return isLeap ? 366 : 365
  }

  const elapsedDays = Math.max(getElapsedDays(), 1)
  const totalDays = Math.max(getTotalDays(), 1)
  const remainingDays = Math.max(totalDays - elapsedDays, 0)

  const avgPerDay = amount / elapsedDays
  const remainingToGoal = Math.max(goalTarget - amount, 0)
  const requiredPerDayNow =
    remainingDays > 0 ? remainingToGoal / remainingDays : remainingToGoal

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Zarobek ({label})</p>
        <p className="text-3xl font-bold text-primary">
          {amount.toFixed(2)} zł
        </p>
      </Card>

      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Poprzedni okres</p>
        <p className="text-2xl font-semibold">{prevAmount.toFixed(2)} zł</p>
      </Card>

      <Card className="p-4 text-center flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">Zmiana vs poprzedni</p>
        {formatChange(changePct)}
      </Card>

      <Card className="p-4 flex flex-col gap-2 justify-center">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Cel ({label})</p>
          <span className="text-sm font-medium">
            {goalTarget.toFixed(2)} zł
          </span>
        </div>

        <Progress value={progressPct} indicatorClassName={indicatorClassName} />

        <div className="flex items-center justify-between text-sm">
          <span>Postęp</span>
          <span className="font-medium">{progressPct.toFixed(0)}%</span>
        </div>

        <div className="mt-1 pt-2 border-t border-border/60 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Średnio / dzień</span>
            <span className="font-medium">{avgPerDay.toFixed(2)} zł</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cel / dzień (teraz)</span>
            <span className="font-medium">
              {requiredPerDayNow.toFixed(2)} zł
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default OplTechEarningsKpis
