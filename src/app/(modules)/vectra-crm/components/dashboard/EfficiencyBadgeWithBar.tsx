'use client'

/**
 * EfficiencyBadgeWithBar
 * Shows efficiency ratio as a badge and progress bar.
 */

type Props = {
  ratio: number
  completed?: number
  assigned?: number
  showRatioText?: boolean
  className?: string
}

const getEfficiencyColor = (ratio: number) => {
  if (ratio < 50) return 'bg-danger text-danger'
  if (ratio < 75) return 'bg-warning text-warning'
  return 'bg-success text-success'
}

const EfficiencyBadgeWithBar = ({
  ratio,
  completed,
  assigned,
  showRatioText = true,
  className = '',
}: Props) => {
  const color = getEfficiencyColor(ratio)
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Skuteczność
        </span>
        <div className="flex gap-1 items-center">
          <span className={`font-bold text-sm ${color.split(' ')[1]}`}>
            {showRatioText ? `${ratio.toFixed(2)}%` : null}
          </span>
          {typeof completed === 'number' && typeof assigned === 'number' && (
            <span className="text-xs text-muted-foreground">
              ({completed}/{assigned})
            </span>
          )}
        </div>
      </div>
      <div className="rounded-xl overflow-hidden bg-muted h-2">
        <div
          className={`h-2 transition-all duration-300 rounded-xl ${
            color.split(' ')[0]
          }`}
          style={{
            width: `${Math.min(ratio, 100)}%`,
          }}
        />
      </div>
    </div>
  )
}

export default EfficiencyBadgeWithBar
