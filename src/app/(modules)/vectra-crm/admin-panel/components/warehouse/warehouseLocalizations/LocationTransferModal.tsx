'use client'

import LocationSelector from '@/app/(modules)/vectra-crm/components/warehouse/LocationSelector'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import { toast } from 'sonner'
import LocationTransferItemsTabs from './LocationTransferItemsTabs'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * LocationTransferModal
 * ---------------------------------------------------------
 * • Source warehouse (`fromLocationId`) = first assigned location of user.
 * • Destination warehouse (`toLocationId`) selected in modal.
 * • Provides tabs to pick devices/materials and confirm transfer.
 */
const LocationTransferModal = ({ open, onCloseAction }: Props) => {
  const [toLocation, setToLocation] = useState<{
    id: string
    name: string
  } | null>(null)
  const [editMode, setEditMode] = useState(false)

  const utils = trpc.useUtils()

  const fromLocationId = useActiveLocation()

  /** Create transfer mutation */
  const mutation = trpc.vectra.warehouse.createTransfer.useMutation({
    onSuccess: () => {
      toast.success('Przekazanie utworzone.')
      utils.vectra.warehouse.getOutgoingLocationTransfers.invalidate()
      handleClose()
    },
    onError: () => toast.error('Błąd przy tworzeniu transferu.'),
  })

  const handleClose = () => {
    setToLocation(null)
    setEditMode(false)
    onCloseAction()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl space-y-4 verflow-y-auto">
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
              onClick={() => setEditMode(false)}
            >
              Anuluj
            </Button>
          </div>
        )}

        {/* Items picking tabs */}
        {fromLocationId && toLocation && (
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
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default LocationTransferModal
