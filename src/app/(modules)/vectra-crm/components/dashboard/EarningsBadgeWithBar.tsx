'use client'

import { trpc } from '@/utils/trpc'

/**
 * EarningsBadgeWithBar
 * Shows monthly earnings with a progress bar (goal: monthly revenue).
 */
type Props = {
  amount: number
  showAmountText?: boolean
  className?: string
}

const EarningsBadgeWithBar = ({
  amount,
  showAmountText = true,
  className = '',
}: Props) => {
  // Get monthly goal (default 8000 PLN)
  const { data: goals } = trpc.vectra.user.getGoals.useQuery()
  const monthlyGoal = goals?.revenueGoal ?? 8000

  // Progress bar color
  let barColor = 'bg-success text-success'
  const percent = (amount / monthlyGoal) * 100
  if (percent < 50) barColor = 'bg-danger text-danger'
  else if (percent < 100) barColor = 'bg-warning text-warning'

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Suma zarobku
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
        Cel: {monthlyGoal.toFixed(2)} zł / miesiąc
      </div>
    </div>
  )
}

export default EarningsBadgeWithBar
