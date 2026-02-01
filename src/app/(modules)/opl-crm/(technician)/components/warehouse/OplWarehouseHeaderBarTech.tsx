'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import OplWarehouseFilterTech from './OplWarehouseFilterTech'

interface Props {
  searchTerm: string
  setSearchTerm: (v: string) => void
  setCategoryFilter: (v: string | null) => void
}

/**
 * OplWarehouseHeaderBarTech
 * -------------------------------------------------------------
 * Header for technician warehouse.
 * Contains only search and category filter (no actions).
 */
const OplWarehouseHeaderBarTech = ({
  searchTerm,
  setSearchTerm,
  setCategoryFilter,
}: Props) => {
  return (
    <PageControlBar title="Magazyn">
      <div className="flex items-center justify-between md:justify-end gap-2 w-full">
        <OplWarehouseFilterTech setCategoryFilter={setCategoryFilter} />
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

export default OplWarehouseHeaderBarTech
