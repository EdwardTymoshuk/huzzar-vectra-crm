'use client'

import OplWarehouseTabs from '@/app/(modules)/opl-crm/components/warehouse/OplWarehouseTabs'
import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import OplCollectedFromClientSection from '../components/warehouse/OplCollectedFromClientSection'
import OplTechWarehouseSummaryCard from '../components/warehouse/OplTechWarehouseSummaryCard'
import OplWarehouseHeaderBarTech from '../components/warehouse/OplWarehouseHeaderBarTech'
import OplTechnicianTransferModal from '../components/warehouse/transfer/OplTechnicianTransferModal'
import OplTechnicianTransfersTable from '../components/warehouse/transfer/OplTechnicianTransfersTable'

/**
 * OplTechnicianWarehousePage
 * -------------------------------------------------------------
 * Simplified warehouse page for technicians.
 * - Global search & filter in header
 * - FloatingActionMenu for transfer
 */
const OplTechnicianWarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [isTransferOpen, setTransferOpen] = useState(false)

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <OplWarehouseHeaderBarTech
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCategoryFilter={setCategoryFilter}
      />

      <div className="flex-1 overflow-y-auto space-y-2 px-2 pb-2">
        <OplTechWarehouseSummaryCard />
        <OplCollectedFromClientSection />
        <OplTechnicianTransfersTable />
        <OplWarehouseTabs
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
      <OplTechnicianTransferModal
        open={isTransferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  )
}

export default OplTechnicianWarehousePage
