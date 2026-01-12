'use client'

import DatePicker from '@/app/components/DatePicker'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { addDays, subDays } from 'date-fns'
import { useState } from 'react'
import {
  MdAdd,
  MdChevronLeft,
  MdChevronRight,
  MdFileDownload,
  MdUploadFile,
} from 'react-icons/md'
import AddOrderModal from '../orders/AddOrderModal'
import ImportOrdersModal from '../orders/ImportOrdersModal'
import ReportDialog from '../orders/ReportDialog'
import { usePlanningContext } from './PlanningContext'

/**
 * PlanningHeaderBar
 * Desktop header with left-aligned action buttons.
 * Mobile shows no actions (uses FAB instead).
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

  const { isAdmin, isCoordinator } = useRole()
  const canManage = isAdmin || isCoordinator

  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)
  const [isReportOpen, setReportOpen] = useState(false)

  const handlePrev = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNext = () => setSelectedDate(addDays(selectedDate, 1))

  const desktopActions =
    canManage &&
    (activeTab === 'planning' ? (
      <>
        <Button
          className="hidden xl:flex"
          variant="success"
          onClick={() => setAddModalOpen(true)}
        >
          <MdAdd /> Dodaj ręcznie
        </Button>

        <Button
          className="hidden xl:flex"
          variant="warning"
          onClick={() => setImportModalOpen(true)}
        >
          <MdUploadFile /> Wczytaj z Excela
        </Button>
      </>
    ) : (
      <>
        <Button
          className="hidden xl:flex"
          variant="warning"
          onClick={() => setReportOpen(true)}
        >
          <MdFileDownload /> Generuj raport
        </Button>
      </>
    ))

  return (
    <>
      <PageControlBar title="Planer zleceń" rightActions={desktopActions}>
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

      {/* Modals */}
      <AddOrderModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />
      <ImportOrdersModal
        open={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <ReportDialog open={isReportOpen} onClose={() => setReportOpen(false)} />
    </>
  )
}

export default PlanningHeaderBar
