'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import { useCallback, useState } from 'react'
import { MdAdd } from 'react-icons/md'
import TechnicianAddOrderModal from '../components/orders/addOrder/TechnicianAddOrderModal'
import TechnicianPlanerHeaderBar from '../components/planer/TechnicianPlanerHeaderBar'
import TechnicianPlanerTable from '../components/planer/TechnicianPlanerTable'

/**
 * TechnicianPlanerPage
 * -------------------------------------------------------------
 * Modernized version with unified layout and floating actions.
 * - Header: contains title, date navigation, and search bar
 * - Floating action: add new order
 * - Table: shows current day's orders
 */
const TechnicianPlanerPage = () => {
  // Local states
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()
  const [isAddModalOpen, setAddModalOpen] = useState(false)

  /** Clears the auto-open flag after handling */
  const handleAutoOpen = useCallback(() => {
    setAutoOpenOrderId(undefined)
  }, [])

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* ✅ Unified header bar */}
      <TechnicianPlanerHeaderBar
        title="Zlecenia do wykonania"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* ✅ Main content: scrollable table */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TechnicianPlanerTable
          searchTerm={searchTerm}
          autoOpenOrderId={autoOpenOrderId}
          onAutoOpenHandled={handleAutoOpen}
        />
      </div>

      {/* ✅ Floating Action Menu */}
      <FloatingActionMenu
        mainTooltip="Akcje zleceń"
        actions={[
          {
            label: 'Dodaj zlecenie',
            icon: <MdAdd className="text-xl" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setAddModalOpen(true),
          },
        ]}
        mainIcon={<MdAdd className="text-3xl" />}
        disableRotate
      />

      {/* ✅ Add order modal */}
      <TechnicianAddOrderModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
        onCreated={(id) => setAutoOpenOrderId(id)}
      />
    </div>
  )
}

export default TechnicianPlanerPage
