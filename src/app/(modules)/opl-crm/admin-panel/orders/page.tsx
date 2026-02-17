'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { OplOrderStatus, OplOrderType } from '@prisma/client'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddOplOrderModal from '../components/orders/AddOplOrderModal'
import OplOrdersFilter from '../components/orders/OplOrdersFilter'
import OplOrdersTable from '../components/orders/OplOrdersTable'

/**
 * OplOrdersPage
 * --------------------------------------------------
 * Orders page with:
 * - Header with filters & search
 * - Desktop-only header action buttons (xl+)
 * - Mobile/tablet floating action (below xl)
 */
const OplOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OplOrderStatus | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<OplOrderType | null>(
    null,
  )
  const [ordersTab, setOrdersTab] = useState<
    'ALL' | 'INSTALLATION' | 'SERVICE'
  >('ALL')
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)

  const [isAddModalOpen, setAddModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManageOrders = !isLoading && (isAdmin || isCoordinator)
  const resolvedOrderTypeFilter =
    ordersTab === 'ALL'
      ? orderTypeFilter
      : ordersTab === 'INSTALLATION'
        ? OplOrderType.INSTALLATION
        : OplOrderType.SERVICE

  /** Header actions (visible only on xl screens) */
  const headerActions = canManageOrders ? (
    <div className="flex items-center gap-2">
      <Button onClick={() => setAddModalOpen(true)} variant="success">
        <MdAdd className="text-lg" />
        Dodaj zlecenie
      </Button>
    </div>
  ) : null

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* Header: now with xl-only actions */}
      <PageControlBar title="Zlecenia" rightActions={headerActions}>
        <div className="flex flex-row items-center justify-between gap-2 min-w-0">
          <OplOrdersFilter
            setStatusFilter={setStatusFilter}
            setTechnicianFilter={setTechnicianFilter}
            setOrderTypeFilter={setOrderTypeFilter}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
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
      <div className="flex-1 overflow-y-auto px-2 md:px-4">
        <Tabs
          value={ordersTab}
          onValueChange={(value) =>
            setOrdersTab(value as 'ALL' | 'INSTALLATION' | 'SERVICE')
          }
          className="mb-4"
        >
          <TabsList className="mx-auto grid h-auto w-full max-w-2xl grid-cols-3 gap-1 p-1">
            <TabsTrigger value="ALL" className="w-full">
              Wszystkie
            </TabsTrigger>
            <TabsTrigger value="INSTALLATION" className="w-full">
              Instalacje
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="w-full">
              Serwisy
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <OplOrdersTable
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          technicianFilter={technicianFilter}
          orderTypeFilter={resolvedOrderTypeFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
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
        <AddOplOrderModal
          open={isAddModalOpen}
          onCloseAction={() => setAddModalOpen(false)}
        />
      )}
    </div>
  )
}

export default OplOrdersPage
