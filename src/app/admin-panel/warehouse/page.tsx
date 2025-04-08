'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import { useState } from 'react'
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
        <WarehouseTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default WarehousePage
