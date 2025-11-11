'use client'

import FloatingActionMenu from '@/app/components/shared/FloatingActionMenu'
import PageControlBar from '@/app/components/shared/PageControlBar'
import SearchInput from '@/app/components/shared/SearchInput'
import { useRole } from '@/utils/hooks/useRole'
import { OrderStatus, OrderType } from '@prisma/client'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddOrderModal from '../components/orders/AddOrderModal'
import OrdersFilter from '../components/orders/OrdersFilter'
import OrdersTable from '../components/orders/OrdersTable'

/**
 * OrdersPage
 * --------------------------------------------------
 * Unified orders management page.
 * Layout:
 *  • Header (filters + search)
 *  • Orders table
 *  • Floating action menu (+ / import)
 */
const OrdersPage = () => {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | null>(null)

  // Modals
  const [isAddModalOpen, setAddModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManageOrders = !isLoading && (isAdmin || isCoordinator)

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* Header: filters + search */}
      <PageControlBar title="Zlecenia">
        <div className="flex flex-row items-center justify-end gap-2 w-full">
          <OrdersFilter
            setStatusFilter={setStatusFilter}
            setTechnicianFilter={setTechnicianFilter}
            setOrderTypeFilter={setOrderTypeFilter}
          />
          <SearchInput
            placeholder="Szukaj po nr zlecenia lub adresie"
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-64 w-full"
          />
        </div>
      </PageControlBar>

      {/* Main content: orders table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <OrdersTable
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          technicianFilter={technicianFilter}
          orderTypeFilter={orderTypeFilter}
        />
      </div>

      {/* Floating action (admin / coordinator only) */}
      {canManageOrders && (
        <>
          <FloatingActionMenu
            position="bottom-right"
            disableOverlay
            actions={[
              {
                label: 'Dodaj zlecenie',
                icon: <MdAdd className="text-lg" />,
                colorClass: 'bg-success hover:bg-success/90',
                onClick: () => setAddModalOpen(true),
              },
            ]}
            mainTooltip="Akcje zleceń"
          />

          {/* Modals */}
          <AddOrderModal
            open={isAddModalOpen}
            onCloseAction={() => setAddModalOpen(false)}
          />
        </>
      )}
    </div>
  )
}

export default OrdersPage
