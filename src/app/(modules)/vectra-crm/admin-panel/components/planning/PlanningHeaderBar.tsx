'use client'

import DatePicker from '@/app/components/DatePicker'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { addDays, subDays } from 'date-fns'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { usePlanningContext } from './PlanningContext'

/**
 * PlannerHeaderBar
 * --------------------------------------------------
 * Custom header for the Planner view.
 *
 * Layout rules:
 * - Mobile (sm and below):
 *   Row 1: title (left) + tabs (right, justify-between)
 *   Row 2: date controls + search (single row)
 *
 * - md+:
 *   Single row:
 *   title (left) | all controls on the right side
 *
 * This component is intentionally NOT based on PageControlBar,
 * as Planner has non-standard layout requirements.
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
    <header className="w-full border-b bg-background px-2 py-2 mb-3">
      {/* MOBILE / SM */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* Top row: title + tabs */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-primary whitespace-nowrap">
            Planer zleceń
          </h1>

          <div className="flex gap-1">
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
        </div>

        {/* Bottom row: date + search (single row) */}
        <div className="flex items-center gap-2 min-w-0">
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
            className="flex-1 min-w-0"
          />
        </div>
      </div>

      {/* MD+ */}
      <div className="hidden md:flex items-center justify-between gap-4 min-w-0">
        {/* Left: title */}
        <h1 className="text-lg font-semibold text-primary whitespace-nowrap">
          Planer zleceń
        </h1>

        {/* Right: all controls */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1">
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

          {/* Date controls */}
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

          {/* Search */}
          <SearchInput
            placeholder="Szukaj technika lub zlecenie..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-64"
          />
        </div>
      </div>
    </header>
  )
}

export default PlannerHeaderBar
