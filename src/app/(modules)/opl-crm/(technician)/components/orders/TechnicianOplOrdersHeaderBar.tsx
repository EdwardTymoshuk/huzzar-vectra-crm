'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { OplOrderStatus, OplOrderType } from '@prisma/client'
import { TechnicianOplOrdersFilter } from './TechnicianOplOrdersFilter'

interface TechnicianOplOrdersHeaderBarProps {
  title: string
  searchTerm: string
  setSearchTerm: (v: string) => void
  statusFilter: OplOrderStatus | null
  typeFilter: OplOrderType | null
  setStatusFilter: (v: OplOrderStatus | null) => void
  setTypeFilter: (v: OplOrderType | null) => void
  onClearFilters: () => void
}

/**
 * TechnicianOplOrdersHeaderBar
 * -------------------------------------------------------------
 * Unified top bar for technician orders view.
 * Includes:
 *  - Page title ("Zrealizowane zlecenia")
 *  - Filters (status, type)
 *  - Search input
 */
const TechnicianOplOrdersHeaderBar = ({
  title,
  searchTerm,
  setSearchTerm,
  statusFilter,
  typeFilter,
  setStatusFilter,
  setTypeFilter,
  onClearFilters,
}: TechnicianOplOrdersHeaderBarProps) => {
  return (
    <PageControlBar title={title}>
      <div className="flex items-center justify-between md:justify-end gap-2 w-full">
        {/* Dropdown filters */}
        <TechnicianOplOrdersFilter
          statusValue={statusFilter}
          typeValue={typeFilter}
          setStatusFilterAction={setStatusFilter}
          setOrderTypeFilterAction={setTypeFilter}
          onClearAction={onClearFilters}
        />

        {/* Search input */}
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-full max-w-64"
        />
      </div>
    </PageControlBar>
  )
}

export default TechnicianOplOrdersHeaderBar
