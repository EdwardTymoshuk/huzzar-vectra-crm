'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import WarehouseSummaryCard from '../components/warehouse/WarehouseSummaryCard'
import WarehouseTabs from '../components/warehouse/WarehouseTabs'
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar'
import LocationTransfersTable from '../components/warehouse/warehouseLocalizations/LocationTransfersTable'

const WarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <MaxWidthWrapper>
      <PageHeader title="Magazyn" />
      <div className="space-y-6">
        <WarehouseToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <WarehouseSummaryCard />

        {/* incoming ↔ outgoing warehosue transfers */}
        <LocationTransfersTable />

        <ReturnedFromTechniciansSection />

        <WarehouseTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default WarehousePage
