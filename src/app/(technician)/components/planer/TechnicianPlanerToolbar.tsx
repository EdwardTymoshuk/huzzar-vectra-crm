'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { addDays, subDays } from 'date-fns'
import { Dispatch, SetStateAction } from 'react'
import { MdAdd, MdChevronLeft, MdChevronRight } from 'react-icons/md'

interface Props {
  /** Currently selected date */
  selectedDate: Date
  /** Sets the selected date */
  setSelectedDate: Dispatch<SetStateAction<Date>>
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
  selectedDate,
  setSelectedDate,
  searchTerm,
  setSearchTerm,
  onAddOrder,
}: Props) => {
  /** Navigate to previous day */
  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1))

  /** Navigate to next day */
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1))

  return (
    <div className="flex flex-col gap-4">
      {/* First row: Add order + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Add order button */}
        <Button
          variant="success"
          onClick={onAddOrder}
          className="w-full sm:w-auto whitespace-nowrap"
        >
          <MdAdd className="mr-1" />
          Dodaj zlecenie
        </Button>

        {/* Right: Search input */}
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Szukaj (nr zlecenia lub adres)..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Second row: full-width date navigation */}
      <div className="flex items-center justify-center gap-3">
        {/* Previous day button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevDay}
          aria-label="Poprzedni dzień"
        >
          <MdChevronLeft className="w-5 h-5" />
        </Button>

        <DatePicker
          selected={selectedDate}
          onChange={(d) => d && setSelectedDate(d)}
          range="day"
          allowFuture
        />

        {/* Next day button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextDay}
          aria-label="Następny dzień"
        >
          <MdChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

export default TechnicianPlanerToolbar
