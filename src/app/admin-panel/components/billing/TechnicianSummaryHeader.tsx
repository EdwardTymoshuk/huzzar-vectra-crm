'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

type Props = {
  technicianName: string
  selectedMonth: Date
  totalAssigned: number
  totalCompleted: number
  totalNotCompleted: number
  totalAmount: number
  totalRatio: number // skuteczność w %
}

const MAX_AMOUNT = 6000 // limit do progress bara zarobków

const TechnicianSummaryHeader = ({
  technicianName,
  selectedMonth,
  totalAssigned,
  totalCompleted,
  totalNotCompleted,
  totalAmount,
  totalRatio,
}: Props) => {
  // Kolory progressu jak w systemie
  const amountColor =
    totalAmount < 4000
      ? 'bg-danger'
      : totalAmount < 6000
      ? 'bg-warning'
      : 'bg-success'

  const efficiencyColor =
    totalRatio < 70
      ? 'bg-danger'
      : totalRatio < 90
      ? 'bg-warning'
      : 'bg-success'

  return (
    <Card className="p-6 flex flex-col md:flex-row justify-between items-stretch gap-6 shadow-md">
      {/* Left: Info o techniku i liczby */}
      <div className="flex flex-col justify-between gap-4 w-full md:w-1/2">
        <div>
          <div className="flex gap-2 items-center text-xl font-bold mb-1">
            <span>{technicianName}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2 first-letter:uppercase">
            <span className="font-medium">
              {format(selectedMonth, 'LLLL yyyy', { locale: pl })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            Przypisane: <span className="font-bold ml-1">{totalAssigned}</span>
          </Badge>
          <Badge variant="success">
            Wykonane: <span className="font-bold ml-1">{totalCompleted}</span>
          </Badge>
          <Badge variant="destructive">
            Niewykonane:{' '}
            <span className="font-bold ml-1">{totalNotCompleted}</span>
          </Badge>
        </div>
      </div>

      {/* Right: Zarobki i skuteczność z progress barami */}
      <div className="flex flex-col gap-6 w-full md:w-1/2 justify-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-semibold">
              Suma zarobku
            </span>
            <span className="font-bold text-base">
              {totalAmount.toFixed(2)} zł
            </span>
          </div>
          <div className="rounded-xl overflow-hidden bg-muted">
            <div
              className={`h-3 transition-all duration-300 rounded-xl ${amountColor}`}
              style={{
                width: `${Math.min((totalAmount / MAX_AMOUNT) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-semibold">
              Skuteczność
            </span>
            <span
              className={`font-bold text-base ${
                totalRatio < 50
                  ? 'text-danger'
                  : totalRatio < 75
                  ? 'text-warning'
                  : 'text-success'
              }`}
            >
              {totalRatio.toFixed(2)}%
            </span>
          </div>
          <div className="rounded-xl overflow-hidden bg-muted">
            <div
              className={`h-3 transition-all duration-300 rounded-xl ${efficiencyColor}`}
              style={{
                width: `${Math.min(totalRatio, 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            ({totalCompleted}/{totalAssigned} zleceń)
          </div>
        </div>
      </div>
    </Card>
  )
}

export default TechnicianSummaryHeader
