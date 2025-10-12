'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd, MdUploadFile } from 'react-icons/md'
import AddOrderModal from '../orders/AddOrderModal'
import ImportOrdersModal from '../orders/ImportOrdersModal'

/**
 * PlanningToolbar:
 * - Toolbar for the "Planning" tab.
 * - Provides manual add and Excel import actions.
 */
const PlanningToolbar = () => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)

  // Role-based gating for planning actions
  const { isAdmin, isCoordinator, isLoading } = useRole()
  if (isLoading) return <LoaderSpinner />
  const canManage = isAdmin || isCoordinator
  if (!canManage) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Manual add */}
      <Button variant="success" onClick={() => setAddModalOpen(true)}>
        <MdAdd /> <span className="hidden lg:inline">Dodaj ręcznie</span>
      </Button>

      {/* Excel import */}
      <Button variant="warning" onClick={() => setImportModalOpen(true)}>
        <MdUploadFile />{' '}
        <span className="hidden lg:inline">Wczytaj z Excela</span>
      </Button>

      {/* Modals */}
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

export default PlanningToolbar
