'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import WarehouseSummaryCard from '../components/warehouse/WarehouseSummaryCard'
import WarehouseTabs from '../components/warehouse/WarehouseTabs'
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar'

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
        <ReturnedFromTechniciansSection />
        <WarehouseTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default WarehousePage
