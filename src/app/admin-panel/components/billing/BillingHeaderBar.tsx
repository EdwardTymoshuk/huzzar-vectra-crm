'use client'

import MonthPicker from '@/app/components/shared/MonthPicker'
import PageControlBar from '@/app/components/shared/PageControlBar'

interface BillingHeaderBarProps {
  title: string
  selectedMonth: Date
  onChangeMonth: (d: Date) => void
}

/**
 * BillingHeaderBar
 * -------------------------------------------------------------
 * Unified top bar for the admin billing page.
 * Displays:
 *  - Title ("Rozliczenia techników")
 *  - Month picker on the right
 *  - "Raport" button for generating Excel report
 */
const BillingHeaderBar = ({
  title,
  selectedMonth,
  onChangeMonth,
}: BillingHeaderBarProps) => {
  return (
    <PageControlBar title={title}>
      <div className="flex items-center justify-center md:justify-end gap-3 w-full">
        <MonthPicker selected={selectedMonth} onChange={onChangeMonth} />
      </div>
    </PageControlBar>
  )
}

export default BillingHeaderBar
