'use client'

import PageControlBar from '@/app/components/shared/PageControlBar'
import SearchInput from '@/app/components/shared/SearchInput'

interface EmployeesHeaderBarProps {
  /** Current search value */
  searchTerm: string
  /** Handler to update search input */
  onSearch: (term: string) => void
}

/**
 * EmployeesHeaderBar
 * --------------------------------------------------
 * Unified top bar for Employees management page.
 * - Left: back button
 * - Right: search input
 */
const EmployeesHeaderBar = ({
  searchTerm,
  onSearch,
}: EmployeesHeaderBarProps) => {
  return (
    <PageControlBar title="Pracownicy">
      {/* Right: search */}
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
