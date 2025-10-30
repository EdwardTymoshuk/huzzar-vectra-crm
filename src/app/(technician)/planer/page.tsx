'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useCallback, useState } from 'react'
import TechnicianAddOrderModal from '../components/orders/addOrder/TechnicianAddOrderModal'
import TechnicianPlanerTable from '../components/planer/TechnicianPlanerTable'
import TechnicianPlanerToolbar from '../components/planer/TechnicianPlanerToolbar'

/**
 * TechnicianPlanerPage
 * -------------------------------------------------------------
 * Main daily planner view for technicians.
 * - Displays orders for a selected day.
 * - Integrates top toolbar with date navigation, search, and add button.
 * - Uses TechnicianPlanerTable for order rendering and logic.
 */
const TechnicianPlanerPage = () => {
  /** Local state for filters and modals */
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()
  const [showAddModal, setShowAddModal] = useState(false)

  /** Clears the auto-open flag after it's handled */
  const handleAutoOpen = useCallback(() => {
    setAutoOpenOrderId(undefined)
  }, [])

  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title="Zlecenia do wykonania" />

      {/* Toolbar: Add + Date + Search */}
      <TechnicianPlanerToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddOrder={() => setShowAddModal(true)}
      />

      {/* Orders for selected day */}
      <TechnicianPlanerTable
        searchTerm={searchTerm}
        autoOpenOrderId={autoOpenOrderId}
        onAutoOpenHandled={handleAutoOpen}
      />

      {/* Add Order modal */}
      <TechnicianAddOrderModal
        open={showAddModal}
        onCloseAction={() => setShowAddModal(false)}
        onCreated={(id) => setAutoOpenOrderId(id)}
      />
    </MaxWidthWrapper>
  )
}

export default TechnicianPlanerPage
