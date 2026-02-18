'use client'

import { Button } from '@/app/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import LocationSelector from '@/app/components/warehouse/LocationSelector'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import { toast } from 'sonner'
import LocationTransferItemsTabs from './OplLocationTransferItemsTabs'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * OplLocationTransferModal
 * ---------------------------------------------------------
 * • Source warehouse (`fromLocationId`) = first assigned location of user.
 * • Destination warehouse (`toLocationId`) selected in modal.
 * • Provides tabs to pick devices/materials and confirm transfer.
 */
const OplLocationTransferModal = ({ open, onCloseAction }: Props) => {
  const [toLocation, setToLocation] = useState<{
    id: string
    name: string
  } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [hasDraftItems, setHasDraftItems] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const utils = trpc.useUtils()

  const fromLocationId = useActiveLocation()

  /** Create transfer mutation */
  const mutation = trpc.opl.warehouse.createTransfer.useMutation({
    onSuccess: () => {
      toast.success('Przekazanie utworzone.')
      utils.opl.warehouse.getOutgoingLocationTransfers.invalidate()
      utils.opl.warehouse.getDefinitionsWithStock.invalidate()
      handleClose()
    },
    onError: () => toast.error('Błąd przy tworzeniu transferu.'),
  })

  const handleClose = () => {
    setToLocation(null)
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
    handleClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
      <DialogContent
        className={
          toLocation
            ? 'w-[96vw] max-w-[1500px] h-[92vh] overflow-hidden space-y-4'
            : 'w-[96vw] max-w-[1100px] space-y-4'
        }
      >
        <DialogHeader>
          <DialogTitle>Przekaż sprzęt do innego magazynu</DialogTitle>
        </DialogHeader>

        {/* Destination location selector */}
        {toLocation && !editMode ? (
          <div className="flex items-center justify-between py-2 px-4 rounded-md bg-background border">
            <div>
              <p className="font-bold text-primary">{toLocation.name}</p>
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
            <div className="flex-1">
              <LocationSelector
                currentLocationId={fromLocationId ?? ''}
                excludeCurrent
                value={toLocation}
                onChange={(loc) => {
                  setToLocation(loc)
                  setEditMode(false)
                }}
              />
            </div>

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

        {/* Items picking tabs */}
        {fromLocationId && toLocation && (
          <div className="h-[calc(92vh-210px)] overflow-hidden">
            <LocationTransferItemsTabs
              fromLocationId={fromLocationId}
              toLocationId={toLocation.id}
              onConfirm={(items, notes) =>
                mutation.mutate({
                  fromLocationId,
                  toLocationId: toLocation.id,
                  notes,
                  items,
                })
              }
              loading={mutation.isLoading}
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
              Masz dodane pozycje, które nie zostały przekazane. Czy na pewno chcesz zamknąć?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              Zamknij bez zapisu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplLocationTransferModal
