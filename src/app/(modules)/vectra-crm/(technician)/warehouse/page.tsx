'use client'

import WarehouseSummaryCard from '@/app/(modules)/vectra-crm/(technician)/components/warehouse/WarehouseSummaryCard'
import WarehouseTabs from '@/app/(modules)/vectra-crm/components/warehouse/WarehouseTabs'
import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import CollectedFromClientSection from '../components/warehouse/CollectedFromClientSection'
import TechnicianTransfersTable from '../components/warehouse/TechnicianTransfersTable'
import WarehouseHeaderBarTech from '../components/warehouse/WarehouseHeaderBarTech'
import TransferModal from '../components/warehouse/transfer/TransferModal'

/**
 * TechnicianWarehousePage
 * -------------------------------------------------------------
 * Simplified warehouse page for technicians.
 * - Global search & filter in header
 * - FloatingActionMenu for transfer
 */
const TechnicianWarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [isTransferOpen, setTransferOpen] = useState(false)

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      <WarehouseHeaderBarTech
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCategoryFilter={setCategoryFilter}
      />

      <div className="flex-1 overflow-y-auto space-y-2 px-2 pb-2">
        <WarehouseSummaryCard />
        <CollectedFromClientSection />
        <TechnicianTransfersTable />
        <WarehouseTabs
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
        />
      </div>

      {/* ✅ Floating Action (technician-specific) */}
      <FloatingActionMenu
        actions={[
          {
            label: 'Przekaż sprzęt',
            icon: <CgArrowsExchange className="text-lg" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setTransferOpen(true),
          },
        ]}
        mainTooltip="Akcje magazynowe"
        mainIcon={<CgArrowsExchange className="text-2xl" />}
        disableRotate
      />

      {/* Transfer modal */}
      <TransferModal
        open={isTransferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  )
}

export default TechnicianWarehousePage
