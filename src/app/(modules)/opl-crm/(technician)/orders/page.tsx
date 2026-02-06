'use client'

import { OplOrderStatus, OplOrderType } from '@prisma/client'
import { useCallback, useState } from 'react'
import TechnicianOplOrdersHeaderBar from '../components/orders/TechnicianOplOrdersHeaderBar'
import TechnicianOplOrdersTable from '../components/orders/TechnicianOplOrdersTable'

/**
 * OplTechnicianOrdersPage
 * -------------------------------------------------------------
 * Main view for completed technician orders.
 * - Header: title + filters + search
 * - Scrollable table
 */
const OplTechnicianOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<OplOrderStatus | null>(null)
  const [typeFilter, setTypeFilter] = useState<OplOrderType | null>(null)

  const handleAutoOpen = useCallback(() => {
    setAutoOpenOrderId(undefined)
  }, [])

  const handleClearFilters = useCallback(() => {
    setStatusFilter(null)
    setTypeFilter(null)
  }, [])

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* ✅ Header with filters */}
      <TechnicianOplOrdersHeaderBar
        title="Zrealizowane zlecenia"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        setStatusFilter={setStatusFilter}
        setTypeFilter={setTypeFilter}
        onClearFilters={handleClearFilters}
      />

      {/* ✅ Scrollable orders table */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TechnicianOplOrdersTable
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          autoOpenOrderId={autoOpenOrderId}
          onAutoOpenHandled={handleAutoOpen}
        />
      </div>
    </div>
  )
}

export default OplTechnicianOrdersPage
