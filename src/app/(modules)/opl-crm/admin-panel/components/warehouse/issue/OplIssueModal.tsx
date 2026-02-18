'use client'

import OplTechnicianSelector from '@/app/(modules)/opl-crm/components/OplTechnicianSelector'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { TechnicianLiteVM } from '@/server/core/helpers/mappers/mapTechnicianToVM'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import IssueItemsTabs from './IssueOplItemsTabs'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * OplIssueModal component:
 * - Displays a modal for assigning equipment or materials to a technician.
 * - Allows selection of a technician and items from warehouse stock.
 * - After selection, shows technician name and option to change.
 * - Does not reset state when technician is changed.
 */
const OplIssueModal = ({ open, onCloseAction }: Props) => {
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianLiteVM | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [hasDraftItems, setHasDraftItems] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const resetAndClose = () => {
    setSelectedTechnician(null)
    setEditMode(false)
    setHasDraftItems(false)
    setConfirmCloseOpen(false)
    onCloseAction()
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
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
      <DialogContent
        className={
          selectedTechnician
            ? 'w-[96vw] max-w-[1500px] h-[92vh] overflow-hidden space-y-4'
            : 'w-[96vw] max-w-[1100px] space-y-4'
        }
      >
        <DialogHeader>
          <DialogTitle>Wydanie sprzętu do technika</DialogTitle>
        </DialogHeader>

        {/* Technician selection */}
        {selectedTechnician && !editMode ? (
          <div className="flex items-center justify-between py-2 px-4 rounded-md bg-background border">
            <div>
              <p className="font-bold text-primary">
                {selectedTechnician.name}
                {selectedTechnician.identyficator
                  ? ` | ${selectedTechnician.identyficator}`
                  : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              <CgArrowsExchange className="mr-2" />
              Zmień
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Technician select */}
            <div className="flex-1">
              <OplTechnicianSelector
                value={selectedTechnician}
                onChange={(tech) => {
                  setSelectedTechnician(tech)
                  setEditMode(false)
                }}
              />
            </div>

            {/* Cancel button aligned to selector */}
            <Button
              variant="ghost"
              size="sm"
              className="self-end mb-1"
              onClick={handleAttemptClose}
            >
              Anuluj
            </Button>
          </div>
        )}

        {/* Issue tabs always visible once technician selected */}
        {selectedTechnician && (
          <div className="h-[calc(92vh-210px)] overflow-hidden">
            <IssueItemsTabs
              technicianId={selectedTechnician.id}
              onCloseAction={resetAndClose}
              onDraftChange={setHasDraftItems}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Masz dodane pozycje, które nie zostały wydane. Czy na pewno chcesz zamknąć?
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

export default OplIssueModal
