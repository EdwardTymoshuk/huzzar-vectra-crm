'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import TechnicianOrdersTable from '../components/orders/TechnicianOrdersTable'
import TechnicianOrdersToolbar from '../components/orders/TechnicianOrdersToolbar'

const TechnicianOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()

  return (
    <MaxWidthWrapper>
      <PageHeader title="Moje zlecenia" />

      <div className="space-y-6">
        <TechnicianOrdersToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onCreated={(id) => setAutoOpenOrderId(id)}
        />

        <TechnicianOrdersTable
          searchTerm={searchTerm}
          autoOpenOrderId={autoOpenOrderId}
        />
      </div>
    </MaxWidthWrapper>
  )
}

export default TechnicianOrdersPage
