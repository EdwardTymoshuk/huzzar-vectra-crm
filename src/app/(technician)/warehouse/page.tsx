'use client'

import WarehouseSummaryCard from '@/app/(technician)/components/warehouse/WarehouseSummaryCard'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import SearchInput from '@/app/components/shared/SearchInput'
import { useState } from 'react'
import WarehouseTabs from '../components/warehouse/WarehouseTabs'

/**
 * TechnicianWarehousePage
 * -----------------------
 * Read-only warehouse view accessible to technicians.
 * Displays:
 *   • page header,
 *   • search input,
 *   • tabbed tables (“Urządzenia”, “Materiały”).
 * Administrator-only widgets (summary card, toolbar) are intentionally omitted.
 * UI strings remain in Polish; all comments are written in English.
 */
const TechnicianWarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  return (
    <MaxWidthWrapper>
      <PageHeader title="Magazyn" />

      <div className="space-y-6">
        {/* search input */}
        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj urządzenie lub materiał"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <WarehouseSummaryCard />

        {/* device / material tables */}
        <WarehouseTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default TechnicianWarehousePage
