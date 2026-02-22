'use client'

import DatePicker from '@/app/components/DatePicker'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { addDays, subDays } from 'date-fns'
import { useState } from 'react'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { MdAdd, MdUploadFile } from 'react-icons/md'
import AddOplOrderModal from '../orders/AddOplOrderModal'
import ImportOrdersModal from '../orders/ImportOrdersModal'
import { usePlanningContext } from './PlanningContext'

/**
 * PlannerHeaderBar (OPL)
 * --------------------------------------------------
 * Unified with PageControlBar:
 * - left: title + admin actions
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
  const [isAddOpen, setAddOpen] = useState(false)
  const [isImportOpen, setImportOpen] = useState(false)
  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManage = !isLoading && (isAdmin || isCoordinator)

  const handlePrev = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNext = () => setSelectedDate(addDays(selectedDate, 1))

  const headerActions = canManage ? (
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm" onClick={() => setAddOpen(true)}>
        <MdAdd className="w-4 h-4 mr-1" />
        Dodaj ręcznie
      </Button>
      <Button variant="default" size="sm" onClick={() => setImportOpen(true)}>
        <MdUploadFile className="w-4 h-4 mr-1" />
        Wczytaj z Excela
      </Button>
    </div>
  ) : null

  return (
    <>
      <PageControlBar
        title="Planer zleceń"
        rightActions={headerActions}
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

      {canManage && (
        <>
          <AddOplOrderModal
            open={isAddOpen}
            onCloseAction={() => setAddOpen(false)}
          />
          <ImportOrdersModal
            open={isImportOpen}
            onClose={() => setImportOpen(false)}
          />
        </>
      )}
    </>
  )
}

export default PlannerHeaderBar
