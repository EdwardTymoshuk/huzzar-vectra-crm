'use client'

import DatePicker from '@/app/components/DatePicker'
import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { addDays, subDays } from 'date-fns'
import { useState } from 'react'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { MdAdd, MdNotes, MdUploadFile } from 'react-icons/md'
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
  const [isAddressNotesOpen, setAddressNotesOpen] = useState(false)
  const [addressNotesQuery, setAddressNotesQuery] = useState('')
  const { isAdmin, isCoordinator, isLoading } = useRole()
  const canManage = !isLoading && (isAdmin || isCoordinator)
  const { data: addressNotes = [], isFetching: isAddressNotesLoading } =
    trpc.opl.order.searchAddressNotes.useQuery(
      { query: addressNotesQuery.trim() || undefined, limit: 50 },
      { enabled: isAddressNotesOpen }
    )

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
      <Button variant="outline" size="sm" onClick={() => setAddressNotesOpen(true)}>
        <MdNotes className="w-4 h-4 mr-1" />
        Baza uwag
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
          <Dialog open={isAddressNotesOpen} onOpenChange={setAddressNotesOpen}>
            <DialogContent className="w-[96vw] max-w-3xl max-h-[85dvh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Baza uwag do adresów</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <SearchInput
                  placeholder="Szukaj po mieście, ulicy lub treści uwagi..."
                  value={addressNotesQuery}
                  onChange={setAddressNotesQuery}
                />

                <div className="max-h-[60dvh] overflow-y-auto rounded-md border">
                  {isAddressNotesLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Wczytywanie...
                    </div>
                  ) : addressNotes.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Brak wyników.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {addressNotes.map((row) => (
                        <div key={row.id} className="p-3 text-sm">
                          <div className="font-medium">
                            {row.city}, {row.street}
                          </div>
                          {row.buildingScope && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Zakres: {row.buildingScope}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap mt-2">{row.note}</div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(row.createdAt).toLocaleString('pl-PL')} •{' '}
                            {row.createdBy.name || 'Nieznany użytkownik'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}

export default PlannerHeaderBar
