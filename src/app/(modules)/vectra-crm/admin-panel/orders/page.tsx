'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { Plus } from 'lucide-react'
import { useState } from 'react'
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
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [ordersTab, setOrdersTab] = useState<
    'INSTALLATION' | 'SERVICE' | 'FAILED'
  >('INSTALLATION')

  const [isAddModalOpen, setAddModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManageOrders = !isLoading && (isAdmin || isCoordinator)
  const resolvedOrderTypeFilter =
    ordersTab === 'FAILED'
      ? null
      : ordersTab === 'INSTALLATION'
        ? VectraOrderType.INSTALLATION
        : VectraOrderType.SERVICE
  const resolvedStatusFilter =
    ordersTab === 'FAILED'
      ? VectraOrderStatus.NOT_COMPLETED
      : VectraOrderStatus.COMPLETED

  /** Header actions (visible only on xl screens) */
  const headerActions = canManageOrders ? (
    <Button onClick={() => setAddModalOpen(true)}>
      <Plus className="h-4 w-4" />
      Dodaj zlecenie
    </Button>
  ) : null

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      {/* Header: now with xl-only actions */}
      <PageControlBar
        title="Zlecenia"
        rightActions={headerActions}
        centerContent={
          <Tabs
            value={ordersTab}
            onValueChange={(value) =>
              setOrdersTab(value as 'INSTALLATION' | 'SERVICE' | 'FAILED')
            }
            className="shrink-0"
          >
            <TabsList className="grid h-auto grid-cols-3 gap-1 p-1 w-[360px]">
              <TabsTrigger value="INSTALLATION" className="w-full">
                Instalacje
              </TabsTrigger>
              <TabsTrigger value="SERVICE" className="w-full">
                Serwisy
              </TabsTrigger>
              <TabsTrigger value="FAILED" className="w-full">
                Nieskuteczne
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        enableHorizontalScroll
      >
        <div className="flex flex-row items-center justify-between gap-2 min-w-0">
          <OrdersFilter setTechnicianFilter={setTechnicianFilter} />

          <SearchInput
            placeholder="Szukaj po nr zlecenia lub adresie"
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-64 w-full"
          />
        </div>
      </PageControlBar>

      {/* Main table */}
      <div className="flex-1 min-h-0 overflow-hidden px-2 md:px-4 flex flex-col">
        <div className="flex-1 min-h-0">
          <OrdersTable
            searchTerm={searchTerm}
            statusFilter={resolvedStatusFilter}
            technicianFilter={technicianFilter}
            orderTypeFilter={resolvedOrderTypeFilter}
          />
        </div>
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
                icon: <Plus className="h-4 w-4" />,
                colorClass:
                  'bg-primary text-primary-foreground hover:bg-primary-hover',
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
