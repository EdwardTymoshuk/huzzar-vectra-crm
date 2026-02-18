'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import SearchInput from '@/app/components/SearchInput'
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
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Textarea } from '@/app/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  OplDeviceBasic,
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
} from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaTrashAlt } from 'react-icons/fa'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import OplSerialScanInput from '../issue/OplSerialScanInput'

type ReturnType = 'DEVICE' | 'MATERIAL'
type Props = {
  onClose: () => void
  onDraftChange?: (hasDraft: boolean) => void
}

const OplReturnToOperator = ({ onClose, onDraftChange }: Props) => {
  const utils = trpc.useUtils()

  const [mode, setMode] = useState<ReturnType | null>(null)
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number | undefined>
  >({})

  const [loading, setLoading] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const [issuedDevices, setIssuedDevices] = useState<OplIssuedItemDevice[]>([])
  const [issuedMaterials, setIssuedMaterials] = useState<
    OplIssuedItemMaterial[]
  >([])
  const [notes, setNotes] = useState('')

  const [devicesOpen, setDevicesOpen] = useState(true)
  const [materialsOpen, setMaterialsOpen] = useState(true)

  const activeLocationId = useActiveLocation() ?? ''
  const { data: warehouse = [] } = trpc.opl.warehouse.getAll.useQuery(
    activeLocationId ? { locationId: activeLocationId } : undefined
  )
  const returnMutation = trpc.opl.warehouse.returnToOperator.useMutation()
  const generateReturnReport =
    trpc.opl.warehouse.generateOplReturnToOperatorReport.useMutation()

  useEffect(() => {
    onDraftChange?.(
      issuedDevices.length > 0 ||
        issuedMaterials.length > 0 ||
        notes.trim().length > 0
    )
  }, [issuedDevices, issuedMaterials, notes, onDraftChange])

  const availableMaterials = useMemo(() => {
    return warehouse
      .filter(
        (i) =>
          i.itemType === 'MATERIAL' &&
          i.status === 'AVAILABLE' &&
          i.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }))
  }, [warehouse, search])

  const availableReturnDevices: OplDeviceBasic[] = useMemo(() => {
    return warehouse
      .filter((i) => i.itemType === 'DEVICE' && i.status === 'AVAILABLE')
      .map((item) => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        category: item.category ?? 'OTHER',
        status: item.status,
        deviceDefinitionId: item.deviceDefinitionId,
      }))
  }, [warehouse])

  const handleAddDevice = (device: OplIssuedItemDevice) => {
    if (issuedDevices.some((d) => d.id === device.id)) {
      toast.warning('To urządzenie zostało już dodane.')
      return
    }

    setIssuedDevices((prev) => [...prev, device])
  }

  const handleAddMaterial = (id: string) => {
    const item = availableMaterials.find((m) => m.id === id)
    if (!item) return

    const qty = materialQuantities[id]
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }

    const alreadyAddedQty = issuedMaterials
      .filter((m) => m.id === item.id)
      .reduce((acc, m) => acc + m.quantity, 0)

    if (qty > item.quantity - alreadyAddedQty) {
      toast.warning('Nie można zwrócić więcej niż dostępne w magazynie.')
      return
    }

    const existing = issuedMaterials.find((m) => m.id === id)
    if (existing) {
      setIssuedMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, quantity: m.quantity + qty } : m))
      )
    } else {
      setIssuedMaterials((prev) => [
        ...prev,
        {
          id: item.id,
          type: 'MATERIAL',
          name: item.name,
          quantity: qty,
          materialDefinitionId: item.materialDefinitionId ?? '',
        },
      ])
    }

    setMaterialQuantities((prev) => ({ ...prev, [id]: 1 }))
    setExpandedRows((prev) => prev.filter((r) => r !== id))
  }

  const handleClearAll = () => {
    setIssuedDevices([])
    setIssuedMaterials([])
    setNotes('')
    setClearConfirmOpen(false)
  }

  const removeDevice = (id: string) => {
    setIssuedDevices((prev) => prev.filter((d) => d.id !== id))
  }

  const removeMaterial = (id: string) => {
    setIssuedMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const handleReturn = async () => {
    if (issuedDevices.length === 0 && issuedMaterials.length === 0) {
      return toast.error('Brak pozycji do zwrotu.')
    }

    setLoading(true)
    try {
      const result = await returnMutation.mutateAsync({
        items: [
          ...issuedDevices.map((d) => ({ id: d.id, type: 'DEVICE' as const })),
          ...issuedMaterials.map((m) => ({
            id: m.id,
            type: 'MATERIAL' as const,
            quantity: m.quantity,
          })),
        ],
        notes,
        locationId: activeLocationId,
      })

      toast.success('Sprzęt został zwrócony oraz wygenerowano raport.')

      if (result.historyIds && result.historyIds.length > 0) {
        const base64 = await generateReturnReport.mutateAsync({
          historyIds: result.historyIds,
        })

        const binary = atob(base64)
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))

        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Zwrot-do-operatora_${new Date().toISOString()}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }

      handleClearAll()

      await Promise.all([
        utils.opl.warehouse.getDefinitionsWithStock.invalidate({
          itemType: 'DEVICE',
          locationId: activeLocationId,
        }),
        utils.opl.warehouse.getDefinitionsWithStock.invalidate({
          itemType: 'MATERIAL',
          locationId: activeLocationId,
        }),
      ])
    } catch {
      toast.error('Błąd przy zwrocie.')
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const openCount = Number(devicesOpen) + Number(materialsOpen)
  const devicesListHeightClass =
    !devicesOpen
      ? 'max-h-0'
      : openCount === 2
        ? 'max-h-[22vh]'
        : 'max-h-[46vh]'
  const materialsListHeightClass =
    !materialsOpen
      ? 'max-h-0'
      : openCount === 2
        ? 'max-h-[22vh]'
        : 'max-h-[46vh]'

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section className="rounded-xl border p-4 overflow-y-auto">
        <div className="space-y-4">
          <Select
            value={mode ?? ''}
            onValueChange={(val) => {
              setMode(val as ReturnType)
              setSearch('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Co chcesz zwrócić?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEVICE">Urządzenie</SelectItem>
              <SelectItem value="MATERIAL">Materiał</SelectItem>
            </SelectContent>
          </Select>

          {mode === 'DEVICE' && (
            <OplSerialScanInput
              onAdd={handleAddDevice}
              devices={availableReturnDevices}
              validStatuses={['AVAILABLE']}
              isDeviceUsed={(id) => issuedDevices.some((d) => d.id === id)}
              strictSource="WAREHOUSE"
              successMessages={{
                local: 'Dodano urządzenie do listy zwrotu.',
                warehouse: 'Dodano urządzenie do listy zwrotu.',
              }}
            />
          )}

          {mode === 'MATERIAL' && (
            <div className="space-y-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Szukaj materiał"
              />

              {availableMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak materiałów dostępnych w magazynie.
                </p>
              ) : (
                availableMaterials.map((item) => {
                  const alreadyReturned = issuedMaterials
                    .filter((m) => m.id === item.id)
                    .reduce((sum, m) => sum + m.quantity, 0)
                  const remainingQty = item.quantity - alreadyReturned

                  return (
                    <div
                      key={item.id}
                      className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${
                        remainingQty === 0
                          ? 'opacity-50 pointer-events-none'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col">
                        <Highlight
                          highlightClassName="bg-yellow-200"
                          searchWords={[search]}
                          autoEscape
                          textToHighlight={item.name}
                        />
                        <Badge className="w-fit" variant="secondary">
                          Dostępne: {remainingQty}
                        </Badge>
                      </div>
                      {expandedRows.includes(item.id) ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={remainingQty}
                            className="w-20 h-8 text-sm"
                            value={materialQuantities[item.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setMaterialQuantities((prev) => ({
                                ...prev,
                                [item.id]:
                                  val === ''
                                    ? undefined
                                    : Math.min(Number(val), remainingQty),
                              }))
                            }}
                          />

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAddMaterial(item.id)}
                          >
                            Dodaj
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            setExpandedRows((prev) => [...prev, item.id])
                          }
                        >
                          <MdAdd />
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border p-4 flex flex-col min-h-0">
        <h3 className="text-base font-semibold mb-3">Do zwrotu</h3>

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
                <span className="text-muted-foreground">({issuedDevices.length})</span>
              </AccordionTrigger>
              <AccordionContent className={cn(devicesOpen && openCount >= 1 && 'flex-1 min-h-0')}>
                {issuedDevices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">
                    Brak urządzeń do zwrotu.
                  </p>
                ) : (
                  <div className={cn('space-y-2 pr-1 overflow-y-auto', devicesListHeightClass)}>
                    {issuedDevices.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-md border p-2.5 flex items-start justify-between gap-2"
                      >
                        <div className="text-sm">
                          <p className="font-semibold leading-tight">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Typ: {oplDevicesTypeMap[d.category]} | SN: {d.serialNumber}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => removeDevice(d.id)}
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
                <span className="text-muted-foreground">({issuedMaterials.length})</span>
              </AccordionTrigger>
              <AccordionContent className={cn(materialsOpen && openCount >= 1 && 'flex-1 min-h-0')}>
                {issuedMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">
                    Brak materiałów do zwrotu.
                  </p>
                ) : (
                  <div className={cn('space-y-2 pr-1 overflow-y-auto', materialsListHeightClass)}>
                    {issuedMaterials.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-md border p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="text-sm">
                          <p className="font-semibold leading-tight">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Ilość: <Badge variant="outline">{m.quantity}</Badge>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => removeMaterial(m.id)}
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
              Uwagi do zwrotu (opcjonalnie)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Np. powód zwrotu lub numer dokumentu"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(true)}
              disabled={issuedDevices.length === 0 && issuedMaterials.length === 0}
            >
              Wyczyść
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleReturn}
              disabled={loading}
            >
              {loading ? 'Zwracanie...' : 'Zwróć'}
            </Button>
          </div>
        </div>

        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Czy na pewno chcesz wyczyścić wszystkie pozycje do zwrotu?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>Wyczyść</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  )
}

export default OplReturnToOperator
