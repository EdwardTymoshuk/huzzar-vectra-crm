'use client'

import WarehouseSummaryCard from '@/app/(technician)/components/warehouse/WarehouseSummaryCard'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import TechnicianTransfersTable from '../components/warehouse/TechnicianTransfersTable'
import WarehouseTabs from '../components/warehouse/WarehouseTabs'
import WarehouseToolbarTech from '../components/warehouse/WarehouseToolbarTech'

/**
 * TechnicianWarehousePage
 * Warehouse page for technicians – basic view with search, transfers, and tabs
 */
const TechnicianWarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  return (
    <MaxWidthWrapper>
      {/* page title */}
      <PageHeader title="Magazyn" />

      <div className="space-y-6">
        <WarehouseToolbarTech
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <WarehouseSummaryCard />

        {/* incoming ↔ outgoing transfers */}
        <TechnicianTransfersTable />

        {/* device / material tables */}
        <WarehouseTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default TechnicianWarehousePage
