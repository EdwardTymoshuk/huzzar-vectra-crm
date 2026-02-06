'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'

interface TechnicianOplPlanerHeaderBarProps {
  title: string
  searchTerm: string
  setSearchTerm: (v: string) => void
}

/**
 * TechnicianOplPlanerHeaderBar
 */
const TechnicianOplPlanerHeaderBar = ({
  title,
  searchTerm,
  setSearchTerm,
}: TechnicianOplPlanerHeaderBarProps) => {
  return (
    <PageControlBar title={title}>
      {/* Search */}
      <SearchInput
        placeholder="Szukaj po adresie lub numerze zlecenia..."
        value={searchTerm}
        onChange={setSearchTerm}
        className="max-w-64 w-fit"
      />
    </PageControlBar>
  )
}

export default TechnicianOplPlanerHeaderBar
