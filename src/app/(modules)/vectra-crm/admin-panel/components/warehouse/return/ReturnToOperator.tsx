'use client'

import SearchInput from '@/app/components/SearchInput'
import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
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
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import {
  VectraIssuedItemDevice,
  VectraIssuedItemMaterial,
} from '@/types/vectra-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaTrashAlt } from 'react-icons/fa'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  onClose: () => void
}

const ReturnToOperator = ({ onClose }: Props) => {
  const utils = trpc.useUtils()

  const [serial, setSerial] = useState('')
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number | undefined>
  >({})

  const [loading, setLoading] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const [issuedDevices, setIssuedDevices] = useState<VectraIssuedItemDevice[]>(
    []
  )
  const [issuedMaterials, setIssuedMaterials] = useState<
    VectraIssuedItemMaterial[]
  >([])
  const [notes, setNotes] = useState('')

  const activeLocationId = useActiveLocation() ?? ''
  const { data: warehouse = [] } = trpc.vectra.warehouse.getAll.useQuery(
    activeLocationId ? { locationId: activeLocationId } : undefined
  )
  const returnMutation = trpc.vectra.warehouse.returnToOperator.useMutation()
  const generateReturnReport =
    trpc.vectra.warehouse.generateReturnToOperatorReport.useMutation()

  const availableMaterials = useMemo(() => {
    return warehouse.filter(
      (i) =>
        i.itemType === 'MATERIAL' &&
        i.status === 'AVAILABLE' &&
        i.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [warehouse, search])

  const validateAndAddDevice = () => {
    if (!serial.trim()) return toast.error('Wpisz numer seryjny.')

    const device = warehouse.find(
      (i) =>
        i.itemType === 'DEVICE' &&
        i.serialNumber?.toLowerCase() === serial.trim().toLowerCase()
    )

    if (!device) {
      return toast.error('Nie znaleziono urządzenia o tym numerze.')
    }

    if (device.status !== 'AVAILABLE') {
      return toast.error(
        'To urządzenie nie jest dostępne do zwrotu lub jest przypisane do technika.'
      )
    }

    if (issuedDevices.some((d) => d.id === device.id)) {
      return toast.warning('To urządzenie zostało już dodane.')
    }

    setIssuedDevices((prev) => [
      ...prev,
      {
        id: device.id,
        name: device.name,
        serialNumber: device.serialNumber!,
        category: device.category ?? 'OTHER',
        type: 'DEVICE',
      },
    ])
    setSerial('')
    toast.success('Dodano urządzenie.')
  }

  const handleAddMaterial = (id: string) => {
    const item = availableMaterials.find((m) => m.id === id)
    if (!item) return

    const qty = materialQuantities[id]
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }
    if (qty > item.quantity) {
      toast.warning('Nie można zwrócić więcej niż dostępne w magazynie.')
      return
    }

    const existing = issuedMaterials.find((m) => m.id === id)
    if (existing) {
      setIssuedMaterials((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, quantity: m.quantity + qty } : m
        )
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
      await utils.vectra.warehouse.getAll.invalidate()
    } catch {
      toast.error('Błąd przy zwrocie.')
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const removeDevice = (deviceId: string) => {
    setIssuedDevices((prev) => prev.filter((d) => d.id !== deviceId))
  }

  const removeMaterial = (materialId: string) => {
    setIssuedMaterials((prev) => prev.filter((m) => m.id !== materialId))
  }

  return (
    <div className="grid h-full min-h-0 gap-4 grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.6fr)_minmax(300px,0.6fr)]">
      <section className="rounded-xl border p-4 overflow-y-auto">
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Urządzenia</h3>
              <p className="text-sm text-muted-foreground">
                Wpisz lub zeskanuj numer seryjny urządzenia do zwrotu.
              </p>
            </div>
            <div className="flex gap-2">
          <Input
            className="[text-transform:uppercase] placeholder:normal-case"
            placeholder="Wpisz lub zeskanuj numer seryjny urządzenia"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                validateAndAddDevice()
              }
            }}
          />
          <Button variant="secondary" onClick={validateAndAddDevice}>
            Dodaj
          </Button>
        </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Materiały</h3>
              <p className="text-sm text-muted-foreground">
                Wyszukaj materiał i dodaj ilość do zwrotu.
              </p>
            </div>
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
              const alreadyReturned = issuedMaterials.find(
                (m) => m.id === item.id
              )
              const remainingQty =
                item.quantity - (alreadyReturned?.quantity || 0)

              return (
                <div
                  key={item.id}
                  className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${
                    remainingQty === 0 ? 'opacity-50 pointer-events-none' : ''
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
                        variant="secondary"
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
        </div>
      </section>

      <section className="rounded-xl border p-4 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Urządzenia</h3>
          <span className="text-muted-foreground">({issuedDevices.length})</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {issuedDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak urządzeń do zwrotu.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {issuedDevices.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="text-sm">
                    <p className="font-semibold leading-tight">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Typ: {devicesTypeMap[d.category]} | SN: {d.serialNumber}
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
        </div>
      </section>

      <section className="rounded-xl border p-4 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Materiały</h3>
          <span className="text-muted-foreground">({issuedMaterials.length})</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {issuedMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak materiałów do zwrotu.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
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
        </div>
      </section>

      <section className="xl:col-span-3 rounded-xl border p-4">
        <div className="space-y-3">
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
      </section>

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
    </div>
  )
}

export default ReturnToOperator
