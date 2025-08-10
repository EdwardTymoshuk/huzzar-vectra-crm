// app/(dashboard)/billings/page.tsx
'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import MonthPicker from '@/app/components/shared/MonthPicker'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useState } from 'react'
import { MdFileDownload } from 'react-icons/md'
import BillingMonthlySummaryTable from '../components/billing/BillingMonthlySummaryTable'
import GenerateBillingReportDialog from '../components/billing/GenerateBillingReportDialog'

const BillingsPage = () => {
  // Open/close the report dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  // Month filter for the on-page table
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))
  // Global page-level loading overlay (used when dialog generates files)
  const [isLoading, setIsLoading] = useState(false)

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  return (
    <MaxWidthWrapper>
      {/* Page title */}
      <PageHeader title="Rozliczenia techników" />

      {/* Actions row */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <Button onClick={() => setReportDialogOpen(true)}>
          <MdFileDownload />
          Raport
        </Button>

        <div className="ml-auto">
          <MonthPicker
            selected={month}
            onChange={(date) => setMonth(startOfMonth(date))}
          />
        </div>
      </div>

      {/* Main table filtered by month */}
      <BillingMonthlySummaryTable from={from} to={to} />

      {/* Report dialog — it will notify this page about loading state */}
      <GenerateBillingReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onLoadingChange={setIsLoading}
      />

      {/* Fullscreen loading overlay (centered spinner) */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LoaderSpinner />
            <span className="text-sm text-muted-foreground">
              Generowanie raportu…
            </span>
          </div>
        </div>
      )}
    </MaxWidthWrapper>
  )
}

export default BillingsPage
