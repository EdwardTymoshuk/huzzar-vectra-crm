'use client'

import MonthPicker from '@/app/components/MonthPicker'
import PageControlBar from '@/app/components/PageControlBar'

interface TechnicianBillingHeaderBarProps {
  title: string
  selectedMonth: Date
  onChangeMonth: (d: Date | undefined) => void
}

/**
 * TechnicianBillingHeaderBar
 * -------------------------------------------------------------
 * Top control bar for technician billing.
 * Displays:
 *  - title ("Moje rozliczenia")
 *  - month picker aligned to the right
 */
const TechnicianBillingHeaderBar = ({
  title,
  selectedMonth,
  onChangeMonth,
}: TechnicianBillingHeaderBarProps) => {
  return (
    <PageControlBar title={title} className="justify-center md:justify-between">
      <div className="flex items-center gap-2">
        <MonthPicker selected={selectedMonth} onChange={onChangeMonth} />
      </div>
    </PageControlBar>
  )
}

export default TechnicianBillingHeaderBar
