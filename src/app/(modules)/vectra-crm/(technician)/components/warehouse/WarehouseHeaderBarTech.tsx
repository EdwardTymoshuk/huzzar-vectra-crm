'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import WarehouseFilterTech from './WarehouseFilterTech'

interface Props {
  searchTerm: string
  setSearchTerm: (v: string) => void
  setCategoryFilter: (v: string | null) => void
}

/**
 * WarehouseHeaderBarTech
 * -------------------------------------------------------------
 * Header for technician warehouse.
 * Contains only search and category filter (no actions).
 */
const WarehouseHeaderBarTech = ({
  searchTerm,
  setSearchTerm,
  setCategoryFilter,
}: Props) => {
  return (
    <PageControlBar title="Magazyn">
      <div className="flex items-center justify-between md:justify-end gap-2 w-full">
        <WarehouseFilterTech setCategoryFilter={setCategoryFilter} />
        <SearchInput
          placeholder="Szukaj urządzenia lub materiału..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-full max-w-64"
        />
      </div>
    </PageControlBar>
  )
}

export default WarehouseHeaderBarTech
