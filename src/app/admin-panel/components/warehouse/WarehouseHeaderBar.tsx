'use client'

import PageControlBar from '@/app/components/shared/PageControlBar'
import SearchInput from '@/app/components/shared/SearchInput'
import WarehouseFilter from './WarehouseFilter'

interface WarehouseHeaderBarProps {
  searchTerm: string
  setSearchTerm: (v: string) => void
  setCategoryFilter: (v: string | null) => void
}

/**
 * WarehouseHeaderBar
 * ------------------------------------------------------
 * Unified top control bar for warehouse page.
 * Provides:
 * - global search input,
 * - category filter (for devices/materials),
 * - clean layout aligned with PageControlBar pattern.
 */
const WarehouseHeaderBar = ({
  searchTerm,
  setSearchTerm,
  setCategoryFilter,
}: WarehouseHeaderBarProps) => {
  return (
    <PageControlBar title="Magazyn">
      <div className="flex items-center justify-between md:justify-end gap-2 w-full">
        <WarehouseFilter setCategoryFilter={setCategoryFilter} />
        <SearchInput
          placeholder="Szukaj urządzenia lub materiału..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-60"
        />
      </div>
    </PageControlBar>
  )
}

export default WarehouseHeaderBar
