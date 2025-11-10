'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import PageControlBar from '@/app/components/shared/PageControlBar'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { addDays, subDays } from 'date-fns'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { usePlanningContext } from './PlanningContext'

/**
 * Top bar for planner page.
 * Uses shared context (activeTab, date, search, etc.).
 */
const PlanningHeaderBar = () => {
  const {
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    searchTerm,
    setSearchTerm,
  } = usePlanningContext()

  const handlePrev = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNext = () => setSelectedDate(addDays(selectedDate, 1))

  return (
    <PageControlBar title="Planer zleceń">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === 'planning' ? 'default' : 'outline'}
          onClick={() => setActiveTab('planning')}
        >
          Planowanie
        </Button>
        <Button
          variant={activeTab === 'assignments' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assignments')}
        >
          Zbiórówka
        </Button>
      </div>

      {/* Date controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <MdChevronLeft className="w-5 h-5" />
        </Button>
        <DatePicker
          selected={selectedDate}
          onChange={(d) => d && setSelectedDate(d)}
          range="day"
          allowFuture
        />
        <Button variant="outline" size="icon" onClick={handleNext}>
          <MdChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Szukaj technika lub zlecenie..."
        value={searchTerm}
        onChange={setSearchTerm}
        className="w-56"
      />
    </PageControlBar>
  )
}

export default PlanningHeaderBar
