'use client'

import { trpc } from '@/utils/trpc'

type Props = {
  amount: number
  showAmountText?: boolean
  className?: string
}

const EarningsDailyBadgeWithBar = ({
  amount,
  showAmountText = true,
  className = '',
}: Props) => {
  const { data: goals } = trpc.user.getGoals.useQuery()
  const workingDaysGoal = goals?.workingDaysGoal ?? 20
  const revenueGoal = goals?.revenueGoal ?? 6000
  const dailyGoal = revenueGoal / (workingDaysGoal || 1)

  // progress bar color logic
  let barColor = 'bg-success text-success'
  const percent = (amount / dailyGoal) * 100
  if (percent < 75) barColor = 'bg-danger text-danger'
  else if (percent < 100) barColor = 'bg-warning text-warning'

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Zarobek dzienny
        </span>
        <span className={`font-bold text-sm ${barColor.split(' ')[1]}`}>
          {showAmountText ? `${amount.toFixed(2)} zł` : null}
        </span>
      </div>
      <div className="rounded-xl overflow-hidden bg-muted h-2">
        <div
          className={`h-2 transition-all duration-300 rounded-xl ${
            barColor.split(' ')[0]
          }`}
          style={{
            width: `${Math.min(percent, 100)}%`,
          }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-end">
        Cel: {dailyGoal.toFixed(2)} zł/dzień
      </div>
    </div>
  )
}

export default EarningsDailyBadgeWithBar
