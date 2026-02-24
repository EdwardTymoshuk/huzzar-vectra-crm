'use client'

import OplTechnicianSelector from '@/app/(modules)/opl-crm/components/OplTechnicianSelector'
import IssueItemsTabs from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/issue/IssueOplItemsTabs'
import PageControlBar from '@/app/components/PageControlBar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { OPL_PATH } from '@/lib/constants'
import { TechnicianLiteVM } from '@/server/core/helpers/mappers/mapTechnicianToVM'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import { ImSpinner2 } from 'react-icons/im'
import { MdChevronLeft } from 'react-icons/md'

const OplWarehouseIssuePage = () => {
  const router = useRouter()
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianLiteVM | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [hasDraftItems, setHasDraftItems] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)

  const goBack = () => {
    setIsNavigatingBack(true)
    router.push(`${OPL_PATH}/admin-panel?tab=warehouse`)
  }

  const resetAndClose = () => {
    setSelectedTechnician(null)
    setEditMode(false)
    setHasDraftItems(false)
    setConfirmCloseOpen(false)
    goBack()
  }

  const handleAttemptClose = () => {
    if (hasDraftItems) {
      setConfirmCloseOpen(true)
      return
    }
    resetAndClose()
  }

  return (
    <>
      <div className="grid w-full flex-1 h-[calc(100dvh-143px)] min-h-[calc(100dvh-143px)] max-h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] md:min-h-[calc(100dvh-80px)] md:max-h-[calc(100dvh-80px)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PageControlBar
          title="Wydanie sprzętu do technika"
          leftStart={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={handleAttemptClose}
              disabled={isNavigatingBack}
            >
              {isNavigatingBack ? (
                <ImSpinner2 className="text-sm animate-spin" />
              ) : (
                <MdChevronLeft className="text-lg" />
              )}
              {isNavigatingBack ? 'Powrót...' : 'Powrót'}
            </Button>
          }
        />

        <div className="min-h-0 max-h-full overflow-hidden px-2 pb-2">
          <div className="rounded-xl border p-3 md:p-4 h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
            {selectedTechnician && !editMode ? (
              <div className="flex items-center justify-between py-2 px-4 rounded-md bg-background border">
                <p className="font-bold text-primary">
                  {selectedTechnician.name}
                  {selectedTechnician.identyficator
                    ? ` | ${selectedTechnician.identyficator}`
                    : ''}
                </p>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <CgArrowsExchange className="mr-2" />
                  Zmień
                </Button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-end gap-2">
                <div className="flex-1">
                  <OplTechnicianSelector
                    value={selectedTechnician}
                    onChange={(tech) => {
                      setSelectedTechnician(tech)
                      setEditMode(false)
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={handleAttemptClose}
                >
                  Anuluj
                </Button>
              </div>
            )}

            {selectedTechnician ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <IssueItemsTabs
                  technicianId={selectedTechnician.id}
                  onCloseAction={resetAndClose}
                  onDraftChange={setHasDraftItems}
                />
              </div>
            ) : (
              <div className="min-h-0 rounded-xl border bg-muted/20 text-sm text-muted-foreground flex items-center justify-center px-4 text-center overflow-y-auto">
                Wybierz technika, aby rozpocząć wydanie sprzętu i materiałów.
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Masz dodane pozycje, które nie zostały wydane. Czy na pewno chcesz
              zamknąć?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndClose}>
              Zamknij bez zapisu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplWarehouseIssuePage
