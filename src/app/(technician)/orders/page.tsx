'use client'

import { OrderStatus, OrderType } from '@prisma/client'
import { useCallback, useState } from 'react'
import TechnicianOrdersHeaderBar from '../components/orders/TechnicianOrdersHeaderBar'
import TechnicianOrdersTable from '../components/orders/TechnicianOrdersTable'

/**
 * TechnicianOrdersPage
 * -------------------------------------------------------------
 * Main view for completed technician orders.
 * - Header: title + filters + search
 * - Scrollable table
 */
const TechnicianOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [typeFilter, setTypeFilter] = useState<OrderType | null>(null)

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
      <TechnicianOrdersHeaderBar
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
        <TechnicianOrdersTable
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

export default TechnicianOrdersPage
