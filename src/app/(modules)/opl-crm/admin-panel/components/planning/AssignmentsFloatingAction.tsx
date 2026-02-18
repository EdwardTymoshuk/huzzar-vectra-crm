'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdDownload } from 'react-icons/md'
import ReportDialog from '../orders/ReportDialog'

const AssignmentsFloatingAction = () => {
  const [isReportOpen, setReportOpen] = useState(false)
  const { isAdmin, isCoordinator, isLoading } = useRole()
  if (isLoading) return null
  if (!isAdmin && !isCoordinator) return null

  return (
    <div className="xl:hidden">
      <FloatingActionMenu
        actions={[
          {
            label: 'Generuj raport',
            icon: <MdDownload className="text-lg" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setReportOpen(true),
          },
        ]}
        mainIcon={<MdDownload className="text-3xl" />}
        mainTooltip="Generuj raport"
        disableRotate
      />
      <ReportDialog open={isReportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}

export default AssignmentsFloatingAction
