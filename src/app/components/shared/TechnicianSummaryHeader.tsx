'use client'

/**
 * TechnicianSummaryHeader
 * Summary card for technician's orders and stats for the selected month.
 */

import EarningsBadgeWithBar from '@/app/components/shared/EarningsBadgeWithBar'
import EfficiencyBadgeWithBar from '@/app/components/shared/EfficiencyBadgeWithBar'
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
  totalRatio: number
}

const TechnicianSummaryHeader = ({
  technicianName,
  selectedMonth,
  totalAssigned,
  totalCompleted,
  totalNotCompleted,
  totalAmount,
  totalRatio,
}: Props) => {
  return (
    <Card className="p-6 flex bg-muted flex-col md:flex-row justify-between items-stretch gap-6 shadow-md">
      {/* Left: technician info and numbers */}
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

      {/* Right: earnings & efficiency */}
      <div className="flex flex-col gap-6 w-full md:w-1/2 justify-center">
        <EarningsBadgeWithBar amount={totalAmount} />
        <EfficiencyBadgeWithBar
          ratio={totalRatio}
          completed={totalCompleted}
          assigned={totalAssigned}
        />
      </div>
    </Card>
  )
}

export default TechnicianSummaryHeader
