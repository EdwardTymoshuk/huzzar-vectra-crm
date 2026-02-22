'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { ReactNode } from 'react'

interface OplEmployeesHeaderBarProps {
  searchTerm: string
  onSearch: (term: string) => void
  centerContent?: ReactNode
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
  centerContent,
}: OplEmployeesHeaderBarProps) => {
  return (
    <PageControlBar
      title="Pracownicy"
      centerContent={centerContent}
      enableHorizontalScroll
    >
      <SearchInput
        placeholder="Szukaj pracownika"
        value={searchTerm}
        onChange={onSearch}
        className="w-56 md:w-64 min-w-[224px]"
      />
    </PageControlBar>
  )
}

export default OplEmployeesHeaderBar
