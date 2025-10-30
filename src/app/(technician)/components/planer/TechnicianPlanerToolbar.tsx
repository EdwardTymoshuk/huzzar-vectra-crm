'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { MdAdd } from 'react-icons/md'

interface Props {
  /** Current search term */
  searchTerm: string
  /** Updates the search term */
  setSearchTerm: (val: string) => void
  /** Opens Add Order modal */
  onAddOrder: () => void
}

/**
 * TechnicianPlanerToolbar
 * -------------------------------------------------------------
 * Top toolbar for the technician daily planner.
 * - First row: "Dodaj zlecenie" (left) + "Szukaj" (right)
 * - Second row: Full-width DatePicker with prev/next buttons
 * - Fully responsive for mobile and desktop layouts.
 */
const TechnicianPlanerToolbar = ({
  searchTerm,
  setSearchTerm,
  onAddOrder,
}: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="success"
          onClick={onAddOrder}
          className="w-full sm:w-auto whitespace-nowrap"
        >
          <MdAdd className="mr-1" />
          Dodaj zlecenie
        </Button>

        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Szukaj (nr zlecenia lub adres)..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>
    </div>
  )
}

export default TechnicianPlanerToolbar
