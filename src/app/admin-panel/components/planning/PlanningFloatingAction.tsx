'use client'

import FloatingActionMenu from '@/app/components/shared/FloatingActionMenu'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd, MdEdit, MdUploadFile } from 'react-icons/md'
import AddOrderModal from '../orders/AddOrderModal'
import ImportOrdersModal from '../orders/ImportOrdersModal'

/**
 * PlanningFloatingAction
 * --------------------------------------------------
 * Wrapper for FloatingActionMenu, specific to the planning page.
 * Handles modal logic and role gating.
 */
const PlanningFloatingAction = () => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading } = useRole()
  if (isLoading) return null
  const canManage = isAdmin || isCoordinator
  if (!canManage) return null

  return (
    <div className="xl:hidden">
      <FloatingActionMenu
        actions={[
          {
            label: 'Dodaj ręcznie',
            icon: <MdEdit className="text-lg" />,
            colorClass: 'bg-success hover:bg-success/90',
            onClick: () => setAddModalOpen(true),
          },
          {
            label: 'Wczytaj z Excela',
            icon: <MdUploadFile className="text-lg" />,
            colorClass: 'bg-warning hover:bg-warning/90',
            onClick: () => setImportModalOpen(true),
          },
        ]}
        mainIcon={<MdAdd className="text-3xl" />}
        mainTooltip="Dodaj lub importuj zlecenia"
      />

      <AddOrderModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />
      <ImportOrdersModal
        open={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  )
}

export default PlanningFloatingAction
