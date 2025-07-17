'use client'

/**
 * EarningsBadgeWithBar
 * Shows total earnings as a badge and progress bar.
 */

type Props = {
  amount: number
  maxAmount?: number
  showAmountText?: boolean
  className?: string
}

const getEarningsColor = (amount: number, maxAmount: number) => {
  if (amount < 4000) return 'bg-danger text-danger'
  if (amount < 6000) return 'bg-warning text-warning'
  return 'bg-success text-success'
}

const EarningsBadgeWithBar = ({
  amount,
  maxAmount = 6000,
  showAmountText = true,
  className = '',
}: Props) => {
  const color = getEarningsColor(amount, maxAmount)
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Suma zarobku
        </span>
        <span className={`font-bold text-sm ${color.split(' ')[1]}`}>
          {showAmountText ? `${amount.toFixed(2)} zł` : null}
        </span>
      </div>
      <div className="rounded-xl overflow-hidden bg-muted h-2">
        <div
          className={`h-2 transition-all duration-300 rounded-xl ${
            color.split(' ')[0]
          }`}
          style={{
            width: `${Math.min((amount / maxAmount) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  )
}

export default EarningsBadgeWithBar
