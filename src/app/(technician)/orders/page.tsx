'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import SearchInput from '@/app/components/shared/SearchInput'
import { useCallback, useState } from 'react'
import TechnicianOrdersTable from '../components/orders/TechnicianOrdersTable'

const TechnicianOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | undefined>()

  const handleAutoOpen = useCallback(() => {
    setAutoOpenOrderId(undefined)
  }, [])

  return (
    <MaxWidthWrapper>
      <PageHeader title="Zrealizowane zlecenia" />

      <div className="space-y-6">
        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj po nr zlecenia lub adresie"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        <TechnicianOrdersTable
          searchTerm={searchTerm}
          autoOpenOrderId={autoOpenOrderId}
          onAutoOpenHandled={handleAutoOpen}
        />
      </div>
    </MaxWidthWrapper>
  )
}

export default TechnicianOrdersPage
