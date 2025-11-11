'use client'

import PageControlBar from '@/app/components/shared/PageControlBar'
import SearchInput from '@/app/components/shared/SearchInput'
import { OrderStatus, OrderType } from '@prisma/client'
import { TechnicianOrdersFilter } from './TechnicianOrdersFilter'

interface TechnicianOrdersHeaderBarProps {
  title: string
  searchTerm: string
  setSearchTerm: (v: string) => void
  statusFilter: OrderStatus | null
  typeFilter: OrderType | null
  setStatusFilter: (v: OrderStatus | null) => void
  setTypeFilter: (v: OrderType | null) => void
  onClearFilters: () => void
}

/**
 * TechnicianOrdersHeaderBar
 * -------------------------------------------------------------
 * Unified top bar for technician orders view.
 * Includes:
 *  - Page title ("Zrealizowane zlecenia")
 *  - Filters (status, type)
 *  - Search input
 */
const TechnicianOrdersHeaderBar = ({
  title,
  searchTerm,
  setSearchTerm,
  statusFilter,
  typeFilter,
  setStatusFilter,
  setTypeFilter,
  onClearFilters,
}: TechnicianOrdersHeaderBarProps) => {
  return (
    <PageControlBar title={title}>
      <div className="flex items-center justify-between md:justify-end gap-2 w-full">
        {/* Dropdown filters */}
        <TechnicianOrdersFilter
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
          className="w-full sm:max-w-64"
        />
      </div>
    </PageControlBar>
  )
}

export default TechnicianOrdersHeaderBar
