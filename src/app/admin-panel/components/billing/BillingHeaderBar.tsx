'use client'

import MonthPicker from '@/app/components/shared/MonthPicker'
import PageControlBar from '@/app/components/shared/PageControlBar'
import { Button } from '@/app/components/ui/button'
import { MdFileDownload } from 'react-icons/md'

interface BillingHeaderBarProps {
  title: string
  selectedMonth: Date
  onChangeMonth: (d: Date) => void

  /** Report callback from parent */
  onGenerateReport: () => void
}

/**
 * BillingHeaderBar
 * -------------------------------------------------------------
 * - Title on the left
 * - Month picker in the middle
 * - "Generate report" button on xl+ only
 */
const BillingHeaderBar = ({
  title,
  selectedMonth,
  onChangeMonth,
  onGenerateReport,
}: BillingHeaderBarProps) => {
  const rightActions = (
    <div className="hidden xl:flex items-center">
      <Button
        variant="warning"
        onClick={onGenerateReport}
        className="flex items-center gap-2"
      >
        <MdFileDownload className="text-lg" />
        Generuj raport
      </Button>
    </div>
  )

  return (
    <PageControlBar title={title} rightActions={rightActions}>
      <div className="flex items-center justify-center md:justify-end gap-3 w-full">
        <MonthPicker selected={selectedMonth} onChange={onChangeMonth} />
      </div>
    </PageControlBar>
  )
}

export default BillingHeaderBar
