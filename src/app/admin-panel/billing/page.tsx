'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import MonthPicker from '@/app/components/shared/MonthPicker'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useState } from 'react'
import { MdFileDownload } from 'react-icons/md'
import BillingTable from '../components/billing/BillingTable'
import GenerateBillingReportDialog from '../components/billing/GenerateBillingReportDialog'

const BillingsPage = () => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  return (
    <MaxWidthWrapper>
      <PageHeader title="Rozliczenia techników" />

      <div className="flex flex-wrap gap-4 items-center mb-4">
        <Button onClick={() => setReportDialogOpen(true)}>
          <MdFileDownload />
          Generuj raport
        </Button>

        <div className="ml-auto">
          <MonthPicker
            selected={month}
            onChange={(date) => setMonth(startOfMonth(date))}
          />
        </div>
      </div>

      <BillingTable from={from} to={to} />

      <GenerateBillingReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </MaxWidthWrapper>
  )
}

export default BillingsPage
