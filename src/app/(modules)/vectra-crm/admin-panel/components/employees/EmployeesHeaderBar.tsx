'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { MdAdd } from 'react-icons/md'

interface EmployeesHeaderBarProps {
  searchTerm: string
  onSearch: (term: string) => void

  /** Callback from parent */
  onAdd: () => void
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
  onAdd,
}: EmployeesHeaderBarProps) => {
  const rightActions = (
    <div className="hidden xl:flex items-center">
      <Button
        variant="success"
        onClick={onAdd}
        className="flex items-center gap-2"
      >
        <MdAdd className="text-lg" />
        Dodaj pracownika
      </Button>
    </div>
  )

  return (
    <PageControlBar title="Pracownicy" rightActions={rightActions}>
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
