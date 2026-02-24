'use client'

import VectraTechnicianSelector from '@/app/(modules)/vectra-crm/components/VectraTechnicianSelector'
import { sumTechnicianMaterialStock } from '@/app/(modules)/vectra-crm/lib/warehouse'
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
import { VectraWarehouseStatus } from '@prisma/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaTrashAlt } from 'react-icons/fa'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  onClose: () => void
}

const ReturnFromTechnician = ({ onClose }: Props) => {
  const utils = trpc.useUtils()

  // State
  const [technicianId, setTechnicianId] = useState<string | null>(null)
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

  const { data: technicians = [] } = trpc.vectra.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })
  const selectedTechnician = useMemo(
    () => technicians.find((t) => t.id === technicianId) ?? null,
    [technicians, technicianId]
  )

  const activeLocationId = useActiveLocation()

  const { data: warehouse = [] } =
    trpc.vectra.warehouse.getItemsForReturn.useQuery({
      locationId: activeLocationId ?? undefined,
      technicianId: technicianId ?? undefined,
    })

  const returnMutation = trpc.vectra.warehouse.returnToWarehouse.useMutation()

  /* ────────────── refs (autofocus) ───────── */
  const serialInputRef = useRef<HTMLInputElement>(null)

  // Extract unique material names assigned to technician
  const assignedMaterialNames = useMemo(() => {
    if (!technicianId) return []
    return [
      ...new Set(
        warehouse
          .filter(
            (item) =>
              item.itemType === 'MATERIAL' && item.assignedToId === technicianId
          )
          .map((item) => item.name)
      ),
    ].filter((name) => name.toLowerCase().includes(search.toLowerCase()))
  }, [warehouse, technicianId, search])

  useEffect(() => {
    setMaterialQuantities((prev) => {
      const updated = { ...prev }
      let changed = false

      assignedMaterialNames.forEach((name) => {
        if (updated[name] === undefined) {
          updated[name] = 1
          changed = true
        }
      })

      return changed ? updated : prev
    })
  }, [assignedMaterialNames])

  // Add material to return list
  /** Add material to return list using actual warehouse IDs */
  const handleAddMaterial = (materialName: string) => {
    if (!technicianId) return

    const qty = materialQuantities[materialName]
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }

    // All records assigned to this technician for this material
    const availableRecords = warehouse
      .filter(
        (i) =>
          i.itemType === 'MATERIAL' &&
          i.assignedToId === technicianId &&
          i.name === materialName
      )
      .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0)) // largest first

    const technicianQty = sumTechnicianMaterialStock(
      warehouse,
      technicianId,
      materialName
    )
    const alreadyAddedQty = issuedMaterials
      .filter((m) => m.name === materialName)
      .reduce((sum, m) => sum + m.quantity, 0)

    if (qty > technicianQty - alreadyAddedQty) {
      toast.warning('Nie można zwrócić więcej niż technik posiada.')
      return
    }

    /* =============================================================
     * 🧠 MAIN LOGIC
     * Break user-entered quantity into specific warehouse items (IDs)
     * ============================================================= */

    let remaining = qty
    const additions: VectraIssuedItemMaterial[] = []

    for (const rec of availableRecords) {
      if (remaining <= 0) break

      const available = rec.quantity ?? 0
      if (available <= 0) continue

      const take = Math.min(available, remaining)

      additions.push({
        id: rec.id, // ✔ correct warehouse item ID
        type: 'MATERIAL',
        name: materialName,
        quantity: take,
        materialDefinitionId: rec.materialDefinitionId ?? '',
      })

      remaining -= take
    }

    // Add split material items to the issued list
    setIssuedMaterials((prev) => [...prev, ...additions])

    // Clear input
    setMaterialQuantities((prev) => ({ ...prev, [materialName]: 1 }))
    setExpandedRows((prev) => prev.filter((r) => r !== materialName))

    toast.success('Dodano materiał do zwrotu.')
  }

  // Remove item from return list
  const handleClearAll = () => {
    setIssuedDevices([])
    setIssuedMaterials([])
    setNotes('')
    setClearConfirmOpen(false)
  }

  // Validate and add device by serial number
  const validateAndAddDevice = () => {
    if (!serial.trim()) return toast.error('Wpisz numer seryjny.')

    const device = warehouse.find(
      (i) =>
        i.itemType === 'DEVICE' &&
        i.serialNumber?.trim().toUpperCase() === serial.trim().toUpperCase()
    )

    if (!device) return toast.error('Nie znaleziono urządzenia o tym numerze.')

    /* ✅ allow ASSIGNED or COLLECTED_FROM_CLIENT */
    const acceptable: VectraWarehouseStatus[] = [
      'ASSIGNED',
      'COLLECTED_FROM_CLIENT',
    ]
    if (!acceptable.includes(device.status)) {
      return toast.error('To urządzenie nie jest przypisane do technika.')
    }

    if (device.assignedToId !== technicianId) {
      return toast.error('To urządzenie jest przypisane do innego technika.')
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
    /* ←− auto-focus back to input */
    serialInputRef.current?.focus()
  }

  // Finalize the return operation
  const handleReturn = async () => {
    if (!technicianId) return
    if (issuedDevices.length === 0 && issuedMaterials.length === 0) {
      return toast.error('Brak pozycji do zwrotu.')
    }

    setLoading(true)
    try {
      await returnMutation.mutateAsync({
        items: [
          ...issuedDevices.map((d) => ({ id: d.id, type: 'DEVICE' as const })),
          ...issuedMaterials.map((m) => ({
            id: m.id,
            type: 'MATERIAL' as const,
            quantity: m.quantity,
          })),
        ],
        locationId: activeLocationId ?? '',
        notes,
      })

      toast.success('Zwrot przyjęty.')
      handleClearAll()
      await utils.vectra.warehouse.getAll.invalidate()
    } catch {
      toast.error('Błąd przy zwrocie.')
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="space-y-6">
      {/* Technician selection */}
      <VectraTechnicianSelector
        value={selectedTechnician}
        onChange={(tech) => {
          setTechnicianId(tech?.id ?? null)
          setSearch('')
          setSerial('')
          setIssuedDevices([])
          setIssuedMaterials([])
          setNotes('')
        }}
      />

      {technicianId && (
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
                    ref={serialInputRef}
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

                {assignedMaterialNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Brak materiałów przypisanych do technika.
                  </p>
                ) : (
                  assignedMaterialNames.map((materialName) => {
                    const assignedQty = sumTechnicianMaterialStock(
                      warehouse,
                      technicianId!,
                      materialName
                    )
                    const alreadyReturned = issuedMaterials
                      .filter((m) => m.name === materialName)
                      .reduce((sum, m) => sum + m.quantity, 0)
                    const remainingQty = assignedQty - alreadyReturned

                    return (
                      <div
                        key={materialName}
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
                            textToHighlight={materialName}
                          />
                          <Badge className="w-fit" variant="secondary">
                            Ilość: {remainingQty}
                          </Badge>
                        </div>
                        {expandedRows.includes(materialName) ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={remainingQty}
                              className="w-20 h-8 text-sm"
                              value={materialQuantities[materialName] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setMaterialQuantities((prev) => ({
                                  ...prev,
                                  [materialName]:
                                    val === ''
                                      ? undefined
                                      : Math.min(Number(val), remainingQty),
                                }))
                              }}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAddMaterial(materialName)}
                            >
                              Dodaj
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              setExpandedRows((prev) => [...prev, materialName])
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
                        onClick={() =>
                          setIssuedDevices((prev) =>
                            prev.filter((item) => item.id !== d.id)
                          )
                        }
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
              <span className="text-muted-foreground">
                ({new Set(issuedMaterials.map((m) => m.name)).size})
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {issuedMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  Brak materiałów do zwrotu.
                </p>
              ) : (
                <div className="space-y-2 pr-1">
                  {Array.from(
                    issuedMaterials.reduce(
                      (acc, m) => {
                        const current = acc.get(m.name) ?? 0
                        acc.set(m.name, current + m.quantity)
                        return acc
                      },
                      new Map<string, number>()
                    )
                  ).map(([name, quantity]) => (
                    <div
                      key={name}
                      className="rounded-md border p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="text-sm">
                        <p className="font-semibold leading-tight">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          Ilość: <Badge variant="outline">{quantity}</Badge>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger hover:bg-danger/10"
                        onClick={() =>
                          setIssuedMaterials((prev) =>
                            prev.filter((item) => item.name !== name)
                          )
                        }
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
                  disabled={
                    issuedDevices.length === 0 && issuedMaterials.length === 0
                  }
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
        </div>
      )}

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

export default ReturnFromTechnician
