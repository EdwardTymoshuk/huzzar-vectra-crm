'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'

interface TechnicianPlanerHeaderBarProps {
  title: string
  searchTerm: string
  setSearchTerm: (v: string) => void
}

/**
 * TechnicianPlanerHeaderBar
 * -------------------------------------------------------------
 * Unified top bar for technician planner page.
 * Includes:
 *  - title ("Zlecenia do wykonania")
 *  - date navigation (previous/next day)
 *  - search input
 */
const TechnicianPlanerHeaderBar = ({
  title,
  searchTerm,
  setSearchTerm,
}: TechnicianPlanerHeaderBarProps) => {
  return (
    <PageControlBar title={title}>
      {/* Search */}
      <SearchInput
        placeholder="Szukaj po adresie lub numerze zlecenia..."
        value={searchTerm}
        onChange={setSearchTerm}
        className="w-64"
      />
    </PageControlBar>
  )
}

export default TechnicianPlanerHeaderBar
