'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { MdList, MdMap } from 'react-icons/md'

interface PlanningToolbarProps {
  viewMode: 'list' | 'map'
  setViewMode: (mode: 'list' | 'map') => void
  onOrderSearch: (searchTerm: string) => void
  onTechnicianSearch: (searchTerm: string) => void
}

const PlanningToolbar = ({
  viewMode,
  setViewMode,
  onOrderSearch,
  onTechnicianSearch,
}: PlanningToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Search inputs */}
      <div className="flex gap-2 w-full sm:w-auto">
        <SearchInput placeholder="Szukaj zlecenia" onSearch={onOrderSearch} />
        <SearchInput
          placeholder="Szukaj technika"
          onSearch={onTechnicianSearch}
        />
      </div>

      {/* Toggle View Mode */}
      <Button
        variant="outline"
        onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
      >
        {viewMode === 'list' ? (
          <MdMap className="mr-2" />
        ) : (
          <MdList className="mr-2" />
        )}
        {viewMode === 'list' ? 'Mapa' : 'Lista'}
      </Button>
    </div>
  )
}

export default PlanningToolbar
