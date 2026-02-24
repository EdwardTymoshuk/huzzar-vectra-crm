'use client'

import OplLocationTransferItemsTabs from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/warehouseLocalizations/OplLocationTransferItemsTabs'
import PageControlBar from '@/app/components/PageControlBar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import LocationSelector from '@/app/components/warehouse/LocationSelector'
import { OPL_PATH } from '@/lib/constants'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import { ImSpinner2 } from 'react-icons/im'
import { MdChevronLeft } from 'react-icons/md'
import { toast } from 'sonner'

const OplWarehouseTransferPage = () => {
  const router = useRouter()
  const utils = trpc.useUtils()
  const activeLocationId = useActiveLocation()
  const [fromLocation, setFromLocation] = useState<{ id: string; name: string } | null>(null)
  const [toLocation, setToLocation] = useState<{ id: string; name: string } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [hasDraftItems, setHasDraftItems] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)

  useEffect(() => {
    if (activeLocationId && !fromLocation) {
      setFromLocation({ id: activeLocationId, name: '' })
    }
  }, [activeLocationId, fromLocation])

  const effectiveFromLocationId = fromLocation?.id ?? activeLocationId ?? null
  const canStartTransfer = Boolean(
    effectiveFromLocationId &&
      toLocation?.id &&
      effectiveFromLocationId !== toLocation.id
  )

  const locationSelectionHint = useMemo(() => {
    if (!effectiveFromLocationId && !toLocation?.id) {
      return 'Wybierz magazyn źródłowy i docelowy, aby rozpocząć przekazanie urządzeń i materiałów.'
    }
    if (!effectiveFromLocationId) {
      return 'Wybierz magazyn źródłowy.'
    }
    if (!toLocation?.id) {
      return 'Wybierz magazyn docelowy.'
    }
    if (effectiveFromLocationId === toLocation.id) {
      return 'Magazyn źródłowy i docelowy nie mogą być takie same.'
    }
    return ''
  }, [effectiveFromLocationId, toLocation])

  const mutation = trpc.opl.warehouse.createTransfer.useMutation({
    onSuccess: () => {
      toast.success('Przekazanie utworzone.')
      utils.opl.warehouse.getOutgoingLocationTransfers.invalidate()
      if (effectiveFromLocationId) {
        utils.opl.warehouse.getDefinitionsWithStock.invalidate({
          locationId: effectiveFromLocationId,
        })
      } else {
        utils.opl.warehouse.getDefinitionsWithStock.invalidate()
      }
      handleClose()
    },
    onError: () => toast.error('Błąd przy tworzeniu transferu.'),
  })

  const goBack = () => {
    setIsNavigatingBack(true)
    router.push(`${OPL_PATH}/admin-panel?tab=warehouse`)
  }

  const handleClose = () => {
    setToLocation(null)
    setFromLocation(activeLocationId ? { id: activeLocationId, name: '' } : null)
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
    handleClose()
  }

  return (
    <>
      <div className="grid w-full flex-1 h-[calc(100dvh-143px)] min-h-[calc(100dvh-143px)] max-h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] md:min-h-[calc(100dvh-80px)] md:max-h-[calc(100dvh-80px)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PageControlBar
          title="Przekaż sprzęt do innego magazynu"
          leftStart={
            <Button variant="ghost" size="sm" className="gap-1" onClick={handleAttemptClose} disabled={isNavigatingBack}>
              {isNavigatingBack ? <ImSpinner2 className="text-sm animate-spin" /> : <MdChevronLeft className="text-lg" />}
              {isNavigatingBack ? 'Powrót...' : 'Powrót'}
            </Button>
          }
        />

        <div className="min-h-0 overflow-hidden px-2 pb-2">
          <div className="rounded-xl border p-3 md:p-4 h-full min-h-0 overflow-hidden grid grid-rows-[auto_minmax(0,1fr)] gap-4">
            {toLocation && !editMode && effectiveFromLocationId ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2 px-4 rounded-md bg-background border">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Przekazanie między magazynami</p>
                  <p className="font-bold text-primary">
                    {fromLocation?.name || 'Wybrany magazyn'} → {toLocation.name}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <CgArrowsExchange className="mr-2" />
                  Zmień
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Z magazynu</p>
                  <LocationSelector
                    currentLocationId={toLocation?.id ?? ''}
                    excludeCurrent={Boolean(toLocation?.id)}
                    value={fromLocation}
                    onChange={(loc) => {
                      setFromLocation(loc)
                      setEditMode(false)
                    }}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Do magazynu</p>
                  <LocationSelector
                    currentLocationId={effectiveFromLocationId ?? ''}
                    excludeCurrent={Boolean(effectiveFromLocationId)}
                    value={toLocation}
                    onChange={(loc) => {
                      setToLocation(loc)
                      setEditMode(false)
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" className="self-end mb-0.5" onClick={handleAttemptClose}>
                  Anuluj
                </Button>
              </div>
            )}

            {canStartTransfer && effectiveFromLocationId && toLocation ? (
              <div className="min-h-0 overflow-hidden">
                <OplLocationTransferItemsTabs
                  fromLocationId={effectiveFromLocationId}
                  toLocationId={toLocation.id}
                  onConfirm={(items, notes) =>
                    mutation.mutate({
                      fromLocationId: effectiveFromLocationId,
                      toLocationId: toLocation.id,
                      notes,
                      items,
                    })
                  }
                  loading={mutation.isLoading}
                  onDraftChange={setHasDraftItems}
                />
              </div>
            ) : (
              <div className="min-h-0 rounded-xl border bg-muted/20 text-sm text-muted-foreground flex items-center justify-center px-4 text-center overflow-y-auto">
                {locationSelectionHint}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masz dodane pozycje, które nie zostały przekazane. Czy na pewno chcesz zamknąć?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Zamknij bez zapisu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplWarehouseTransferPage
