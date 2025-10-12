'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdDownload } from 'react-icons/md'
import ReportDialog from '../orders/ReportDialog'

/**
 * AssignmentsToolbar:
 * - Toolbar for the "Zbiórówka" tab.
 * - Provides reporting action only.
 */
const AssignmentsToolbar = () => {
  const [isReportDialogOpen, setReportDialogOpen] = useState(false)

  // Role-based gating for reporting actions
  const { isAdmin, isCoordinator, isLoading } = useRole()
  if (isLoading) return <LoaderSpinner />
  const canManage = isAdmin || isCoordinator
  if (!canManage) return null

  return (
    <div className="flex justify-start mb-4">
      {/* Report open */}
      <Button variant="default" onClick={() => setReportDialogOpen(true)}>
        <MdDownload />
        <span className="hidden lg:inline">Raport</span>
      </Button>

      {/* Dialog: reporting */}
      <ReportDialog
        open={isReportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </div>
  )
}

export default AssignmentsToolbar
