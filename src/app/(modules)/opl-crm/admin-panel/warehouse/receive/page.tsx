'use client'

import AddItemForm from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/add/AddItemForm'
import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
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
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { OPL_PATH } from '@/lib/constants'
import { WarehouseFormData } from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaTrashAlt } from 'react-icons/fa'
import { ImSpinner2 } from 'react-icons/im'
import { MdChevronLeft } from 'react-icons/md'
import { toast } from 'sonner'

const OplWarehouseReceivePage = () => {
  const router = useRouter()
  const utils = trpc.useUtils()
  const locationId = useActiveLocation() || undefined

  const [items, setItems] = useState<WarehouseFormData[]>([])
  const [notes, setNotes] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)

  const normalizeItems = (source: WarehouseFormData[]) => {
    const result: WarehouseFormData[] = []
    source.forEach((entry) => {
      if (entry.type === 'MATERIAL') {
        const existingIndex = result.findIndex(
          (item) => item.type === 'MATERIAL' && item.name === entry.name
        )
        if (existingIndex >= 0) {
          const existing = result[existingIndex]
          if (existing.type === 'MATERIAL') {
            result[existingIndex] = {
              ...existing,
              quantity: existing.quantity + entry.quantity,
            }
          }
          return
        }
      }
      result.push(entry)
    })
    return result
  }

  useEffect(() => {
    setItems((prev) => {
      const normalized = normalizeItems(prev)
      return normalized.length === prev.length ? prev : normalized
    })
  }, [])

  const addMutation = trpc.opl.warehouse.addItems.useMutation({
    onSuccess: () => {
      toast.success('Sprzęt został przyjęty na magazyn.')
      utils.opl.warehouse.getAll.invalidate({ locationId })
      setItems([])
      setNotes('')
      goBack()
    },
    onError: () => toast.error('Błąd podczas zapisywania sprzętu.'),
  })

  const goBack = () => {
    setIsNavigatingBack(true)
    router.push(`${OPL_PATH}/admin-panel?tab=warehouse`)
  }

  const hasDraft = items.length > 0 || notes.trim().length > 0

  const handleAttemptClose = () => {
    if (hasDraft) {
      setConfirmCloseOpen(true)
      return
    }
    goBack()
  }

  const handleAddItem = (item: WarehouseFormData) => {
    setItems((prev) => normalizeItems([...prev, item]))
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClearAll = () => {
    setItems([])
    setNotes('')
    setClearConfirmOpen(false)
  }

  const handleSave = () => {
    if (items.length === 0) {
      toast.warning('Dodaj przynajmniej jeden element.')
      return
    }
    addMutation.mutate({ items, notes, locationId })
  }

  const devices = items
    .map((item, index) => ({ item, index }))
    .filter(
      (
        entry
      ): entry is {
        item: Extract<WarehouseFormData, { type: 'DEVICE' }>
        index: number
      } => entry.item.type === 'DEVICE'
    )

  const materials = items
    .map((item, index) => ({ item, index }))
    .filter(
      (
        entry
      ): entry is {
        item: Extract<WarehouseFormData, { type: 'MATERIAL' }>
        index: number
      } => entry.item.type === 'MATERIAL'
    )

  return (
    <>
      <div className="grid w-full flex-1 h-[calc(100dvh-143px)] min-h-[calc(100dvh-143px)] max-h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] md:min-h-[calc(100dvh-80px)] md:max-h-[calc(100dvh-80px)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PageControlBar
          title="Przyjęcie do magazynu"
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

        <div className="min-h-0 overflow-hidden px-2 pb-2">
          <div className="rounded-xl border p-3 md:p-4 h-full min-h-0 overflow-hidden">
            <div className="grid h-full min-h-0 gap-4 grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.6fr)_minmax(300px,0.6fr)]">
              <section className="rounded-xl border p-4 overflow-y-auto min-h-0">
                <AddItemForm existingItems={items} onAddItem={handleAddItem} />
              </section>

              <section className="rounded-xl border p-4 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Urządzenia</h3>
                  <span className="text-muted-foreground">({devices.length})</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      Brak urządzeń na liście.
                    </p>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {devices.map(({ item, index }) => (
                        <div
                          key={`device-${index}`}
                          className="rounded-md border p-2.5 flex items-start justify-between gap-2"
                        >
                          <div className="text-sm">
                            <p className="font-semibold leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Typ: {oplDevicesTypeMap[item.category ?? 'OTHER']} | SN:{' '}
                              {item.serialNumber}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <FaTrashAlt className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border p-4 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Materiały</h3>
                  <span className="text-muted-foreground">({materials.length})</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {materials.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      Brak materiałów na liście.
                    </p>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {materials.map(({ item, index }) => (
                        <div
                          key={`material-${index}`}
                          className="rounded-md border p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="text-sm">
                            <p className="font-semibold leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Ilość: <Badge variant="outline">{item.quantity}</Badge>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <FaTrashAlt className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-3 rounded-xl border p-4">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm text-muted-foreground">
                      Uwagi do przyjęcia (opcjonalnie)
                    </label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Np. numer dokumentu, źródło sprzętu, komentarz"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setClearConfirmOpen(true)}
                      disabled={items.length === 0}
                    >
                      Wyczyść
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={handleSave}
                      disabled={addMutation.isLoading}
                    >
                      {addMutation.isLoading ? 'Zapisywanie...' : 'Zapisz w magazynie'}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz wyczyścić wszystkie pozycje do przyjęcia?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Wyczyść</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masz dodane pozycje, które nie zostały zapisane. Czy na pewno chcesz zamknąć?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={goBack}>Zamknij bez zapisu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplWarehouseReceivePage
