'use client'

import DatePicker from '@/app/components/DatePicker'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { addDays, subDays } from 'date-fns'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { usePlanningContext } from './PlanningContext'

/**
 * PlannerHeaderBar (Vectra)
 * --------------------------------------------------
 * Unified with PageControlBar:
 * - left: title
 * - center: planner tabs
 * - right: date navigation + search
 * - full horizontal scroll when controls don't fit
 */
const PlannerHeaderBar = () => {
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
    <PageControlBar
      title="Planer zleceń"
      centerContent={
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant={activeTab === 'planning' ? 'default' : 'outline'}
            onClick={() => setActiveTab('planning')}
          >
            Planowanie
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'assignments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('assignments')}
          >
            Zbiórówka
          </Button>
        </div>
      }
      enableHorizontalScroll
    >
      <div className="flex items-center gap-2 min-w-[520px]">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <MdChevronLeft className="w-5 h-5" />
        </Button>

        <DatePicker
          selected={selectedDate}
          onChange={(d) => d && setSelectedDate(d)}
          range="day"
          allowFuture
          compact
        />

        <Button variant="outline" size="icon" onClick={handleNext}>
          <MdChevronRight className="w-5 h-5" />
        </Button>

        <SearchInput
          placeholder="Szukaj technika lub zlecenie..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-64 min-w-[220px]"
        />
      </div>
    </PageControlBar>
  )
}

export default PlannerHeaderBar
