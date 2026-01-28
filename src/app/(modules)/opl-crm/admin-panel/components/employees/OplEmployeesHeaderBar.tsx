'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'

interface OplEmployeesHeaderBarProps {
  searchTerm: string
  onSearch: (term: string) => void
}

/**
 * OplEmployeesHeaderBar
 * --------------------------------------------------
 * - Title on the left
 * - Search input in the middle/right
 * - "Add Employee" button on xl+ only
 */
const OplEmployeesHeaderBar = ({
  searchTerm,
  onSearch,
}: OplEmployeesHeaderBarProps) => {
  return (
    <PageControlBar title="Pracownicy">
      <SearchInput
        placeholder="Szukaj pracownika"
        value={searchTerm}
        onChange={onSearch}
        className="w-56 md:w-64"
      />
    </PageControlBar>
  )
}

export default OplEmployeesHeaderBar
