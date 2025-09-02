'use client'

import TechnicianSelector from '@/app/components/shared/TechnicianSelector'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { UserWithBasic } from '@/types'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import IssueItemsTabs from './IssueItemsTabs'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * IssueModal component:
 * - Displays a modal for assigning equipment or materials to a technician.
 * - Allows selection of a technician and items from warehouse stock.
 * - After selection, shows technician name and option to change.
 * - Does not reset state when technician is changed.
 */
const IssueModal = ({ open, onCloseAction }: Props) => {
  const [selectedTechnician, setSelectedTechnician] =
    useState<UserWithBasic | null>(null)
  const [editMode, setEditMode] = useState(false)

  const handleClose = () => {
    setSelectedTechnician(null)
    setEditMode(false)
    onCloseAction()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl space-y-4">
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
              <TechnicianSelector
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
              onClick={() => setEditMode(false)}
            >
              Anuluj
            </Button>
          </div>
        )}

        {/* Issue tabs always visible once technician selected */}
        {selectedTechnician && (
          <IssueItemsTabs
            technicianId={selectedTechnician.id}
            onCloseAction={onCloseAction}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default IssueModal
