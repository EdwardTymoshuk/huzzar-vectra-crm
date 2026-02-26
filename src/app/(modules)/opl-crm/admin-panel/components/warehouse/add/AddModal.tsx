'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Textarea } from '@/app/components/ui/textarea'
import { cn } from '@/lib/utils'
import { WarehouseFormData } from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { FaTrashAlt } from 'react-icons/fa'
import { toast } from 'sonner'
import AddItemForm from './AddItemForm'

const AddModal = ({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) => {
  const [items, setItems] = useState<WarehouseFormData[]>([])
  const [notes, setNotes] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [devicesOpen, setDevicesOpen] = useState(true)
  const [materialsOpen, setMaterialsOpen] = useState(true)

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

  const utils = trpc.useUtils()
  const locationId = useActiveLocation() || undefined

  const addMutation = trpc.opl.warehouse.addItems.useMutation({
    onSuccess: () => {
      toast.success('Sprzęt został przyjęty na magazyn.')
      utils.opl.warehouse.getAll.invalidate({ locationId })
      setItems([])
      setNotes('')
      onCloseAction()
    },
    onError: () => toast.error('Błąd podczas zapisywania sprzętu.'),
  })

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
  const openCount = Number(devicesOpen) + Number(materialsOpen)
  const devicesListHeightClass =
    !devicesOpen
      ? 'max-h-0'
      : openCount === 2
        ? 'md:max-h-[22vh]'
        : 'md:max-h-[46vh]'
  const materialsListHeightClass =
    !materialsOpen
      ? 'max-h-0'
      : openCount === 2
        ? 'md:max-h-[22vh]'
        : 'md:max-h-[46vh]'

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="w-[96vw] max-w-[1450px] h-auto overflow-y-auto md:h-[92vh] md:max-h-[92vh] md:overflow-hidden space-y-4">
        <DialogHeader>
          <DialogTitle>Przyjęcie do magazynu</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:h-[calc(92vh-130px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="rounded-xl border p-4 overflow-y-auto">
            <AddItemForm existingItems={items} onAddItem={handleAddItem} />
          </section>

          <section className="rounded-xl border p-4 flex flex-col min-h-0">
            <h3 className="text-base font-semibold mb-3">Pozycje do przyjęcia</h3>

            <div className="mb-4 flex min-h-0 flex-1 flex-col gap-3">
            <Accordion
              type="multiple"
              value={devicesOpen ? ['devices'] : []}
              onValueChange={(value) => setDevicesOpen(value.includes('devices'))}
              className={cn(
                'border rounded-lg px-3 overflow-hidden',
                devicesOpen && openCount >= 1 ? 'min-h-0 flex-1' : 'shrink-0'
              )}
            >
              <AccordionItem
                value="devices"
                className={cn(
                  'border-none',
                  devicesOpen && openCount >= 1 && 'flex h-full flex-col'
                )}
              >
                <AccordionTrigger className="py-3 text-base font-semibold">
                  Urządzenia{' '}
                  <span className="text-muted-foreground">({devices.length})</span>
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    devicesOpen && openCount >= 1 && 'flex-1 min-h-0'
                  )}
                >
                  {devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      Brak urządzeń na liście.
                    </p>
                  ) : (
                    <div
                      className={cn(
                        'space-y-2 pr-1 overflow-y-auto',
                        devicesListHeightClass
                      )}
                    >
                      {devices.map(({ item, index }) => (
                        <div
                          key={`device-${index}`}
                          className="rounded-md border p-2.5 flex items-start justify-between gap-2"
                        >
                          <div className="text-sm">
                            <p className="font-semibold leading-tight">
                              {item.name}
                            </p>
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion
              type="multiple"
              value={materialsOpen ? ['materials'] : []}
              onValueChange={(value) =>
                setMaterialsOpen(value.includes('materials'))
              }
              className={cn(
                'border rounded-lg px-3 overflow-hidden',
                materialsOpen && openCount >= 1 ? 'min-h-0 flex-1' : 'shrink-0'
              )}
            >
              <AccordionItem
                value="materials"
                className={cn(
                  'border-none',
                  materialsOpen && openCount >= 1 && 'flex h-full flex-col'
                )}
              >
                <AccordionTrigger className="py-3 text-base font-semibold">
                  Materiały{' '}
                  <span className="text-muted-foreground">({materials.length})</span>
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    materialsOpen && openCount >= 1 && 'flex-1 min-h-0'
                  )}
                >
                  {materials.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      Brak materiałów na liście.
                    </p>
                  ) : (
                    <div
                      className={cn(
                        'space-y-2 pr-1 overflow-y-auto',
                        materialsListHeightClass
                      )}
                    >
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            </div>

            <div className="mt-auto space-y-3">
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
                  {addMutation.isLoading
                    ? 'Zapisywanie...'
                    : 'Zapisz w magazynie'}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Czy na pewno chcesz wyczyścić wszystkie pozycje do przyjęcia?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>Wyczyść</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

export default AddModal
