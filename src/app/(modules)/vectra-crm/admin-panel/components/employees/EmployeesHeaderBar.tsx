'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'

interface EmployeesHeaderBarProps {
  searchTerm: string
  onSearch: (term: string) => void
}

/**
 * EmployeesHeaderBar
 * --------------------------------------------------
 * - Title on the left
 * - Search input in the middle/right
 * - "Add Employee" button on xl+ only
 */
const EmployeesHeaderBar = ({
  searchTerm,
  onSearch,
}: EmployeesHeaderBarProps) => {
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

export default EmployeesHeaderBar
