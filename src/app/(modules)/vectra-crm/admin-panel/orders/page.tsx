'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddOrderModal from '../components/orders/AddOrderModal'
import OrdersFilter from '../components/orders/OrdersFilter'
import OrdersTable from '../components/orders/OrdersTable'

/**
 * OrdersPage
 * --------------------------------------------------
 * Orders page with:
 * - Header with filters & search
 * - Desktop-only header action buttons (xl+)
 * - Mobile/tablet floating action (below xl)
 */
const OrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VectraOrderStatus | null>(
    null
  )
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] =
    useState<VectraOrderType | null>(null)

  const [isAddModalOpen, setAddModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManageOrders = !isLoading && (isAdmin || isCoordinator)

  /** Header actions (visible only on xl screens) */
  const headerActions = canManageOrders ? (
    <Button onClick={() => setAddModalOpen(true)} variant="success">
      <MdAdd className="text-lg" />
      Dodaj zlecenie
    </Button>
  ) : null

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* Header: now with xl-only actions */}
      <PageControlBar title="Zlecenia" rightActions={headerActions}>
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

      {/* Main table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <OrdersTable
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          technicianFilter={technicianFilter}
          orderTypeFilter={orderTypeFilter}
        />
      </div>

      {/* Floating actions (below xl) */}
      {canManageOrders && (
        <div className="xl:hidden">
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
        </div>
      )}

      {/* Modal */}
      {canManageOrders && (
        <AddOrderModal
          open={isAddModalOpen}
          onCloseAction={() => setAddModalOpen(false)}
        />
      )}
    </div>
  )
}

export default OrdersPage
