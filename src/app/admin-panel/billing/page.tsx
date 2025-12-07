'use client'

import FloatingActionMenu from '@/app/components/shared/FloatingActionMenu'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import { useRole } from '@/utils/hooks/useRole'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useState } from 'react'
import { MdFileDownload } from 'react-icons/md'
import BillingHeaderBar from '../components/billing/BillingHeaderBar'
import BillingMonthlySummaryTable from '../components/billing/BillingMonthlySummaryTable'
import GenerateBillingReportDialog from '../components/billing/GenerateBillingReportDialog'

/**
 * BillingsPage (Admin)
 * ------------------------------------------------------------
 * Billing summary dashboard:
 * - Header (title + month picker + xl-only report button)
 * - Table (scrollable)
 * - FAB for mobile/tablet (<xl)
 */
const BillingsPage = () => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))
  const [isGenerating, setIsGenerating] = useState(false)

  const { isWarehouseman, isLoading: isRoleLoading } = useRole()

  if (isRoleLoading) return <LoaderSpinner />
  if (isWarehouseman) return <UnauthorizedPage />

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* Header with xl-only report button */}
      <BillingHeaderBar
        title="Rozliczenia techników"
        selectedMonth={month}
        onChangeMonth={setMonth}
        onGenerateReport={() => setReportDialogOpen(true)}
      />

      {/* Scrollable table */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <BillingMonthlySummaryTable from={from} to={to} />
      </div>

      {/* Floating action (mobile & tablet only) */}
      <div className="xl:hidden">
        <FloatingActionMenu
          mainTooltip="Generuj raport"
          mainIcon={<MdFileDownload className="text-2xl" />}
          actions={[
            {
              label: 'Generuj raport',
              icon: <MdFileDownload className="text-lg" />,
              colorClass: 'bg-primary hover:bg-primary/90',
              onClick: () => setReportDialogOpen(true),
            },
          ]}
          disableRotate
        />
      </div>

      {/* Report dialog */}
      <GenerateBillingReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onLoadingChange={setIsGenerating}
      />

      {/* Overlay loader while generating */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LoaderSpinner />
            <span className="text-sm text-muted-foreground">
              Generowanie raportu…
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillingsPage
