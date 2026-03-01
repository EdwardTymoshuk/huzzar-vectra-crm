'use client'

import OplTechnicianSelector from '@/app/(modules)/opl-crm/components/OplTechnicianSelector'
import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { sumOplTechnicianMaterialStock } from '@/app/(modules)/opl-crm/lib/warehouse/sumOplTechnicianMaterialStock'
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
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import {
  OplDeviceBasic,
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
} from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { OplWarehouseStatus } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaTrashAlt } from 'react-icons/fa'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import OplSerialScanInput from '../issue/OplSerialScanInput'

type Props = {
  onClose: () => void
  onDraftChange?: (hasDraft: boolean) => void
}

const OplReturnFromTechnician = ({ onClose, onDraftChange }: Props) => {
  const utils = trpc.useUtils()

  const [technicianId, setTechnicianId] = useState<string | null>(null)
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
  const [damagedByDeviceId, setDamagedByDeviceId] = useState<
    Record<string, boolean>
  >({})
  const [notes, setNotes] = useState('')


  const { data: technicians = [] } = trpc.opl.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  const selectedTechnician = useMemo(
    () => technicians.find((t) => t.id === technicianId) ?? null,
    [technicians, technicianId]
  )

  const activeLocationId = useActiveLocation()

  const { data: warehouse = [] } =
    trpc.opl.warehouse.getItemsForReturn.useQuery({
      locationId: activeLocationId ?? undefined,
      technicianId: technicianId ?? undefined,
    })

  const returnMutation = trpc.opl.warehouse.returnToWarehouse.useMutation()

  useEffect(() => {
    onDraftChange?.(
      issuedDevices.length > 0 ||
        issuedMaterials.length > 0 ||
        notes.trim().length > 0
    )
  }, [issuedDevices, issuedMaterials, notes, onDraftChange])

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
    ]
      .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }))
  }, [warehouse, technicianId, search])

  const availableReturnDevices: OplDeviceBasic[] = useMemo(() => {
    if (!technicianId) return []

    const allowed: OplWarehouseStatus[] = ['ASSIGNED', 'COLLECTED_FROM_CLIENT']

    return warehouse
      .filter(
        (item) =>
          item.itemType === 'DEVICE' &&
          item.assignedToId === technicianId &&
          allowed.includes(item.status)
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        category: item.category ?? 'OTHER',
        status: item.status,
        deviceDefinitionId: item.deviceDefinitionId,
      }))
  }, [warehouse, technicianId])

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

  const handleAddDevice = (device: OplIssuedItemDevice) => {
    if (issuedDevices.some((d) => d.id === device.id)) {
      toast.warning('To urządzenie zostało już dodane.')
      return
    }

    setIssuedDevices((prev) => [...prev, { ...device, isDamaged: false }])
    setDamagedByDeviceId((prev) => ({ ...prev, [device.id]: false }))
  }

  const handleAddMaterial = (materialName: string) => {
    if (!technicianId) return

    const qty = materialQuantities[materialName]
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }

    const availableRecords = warehouse
      .filter(
        (i) =>
          i.itemType === 'MATERIAL' &&
          i.assignedToId === technicianId &&
          i.name === materialName
      )
      .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))

    const technicianQty = sumOplTechnicianMaterialStock(
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

    let remaining = qty
    const additions: OplIssuedItemMaterial[] = []

    for (const rec of availableRecords) {
      if (remaining <= 0) break
      const available = rec.quantity ?? 0
      if (available <= 0) continue

      const take = Math.min(available, remaining)

      additions.push({
        id: rec.id,
        type: 'MATERIAL',
        name: materialName,
        quantity: take,
        materialDefinitionId: rec.materialDefinitionId ?? '',
      })

      remaining -= take
    }

    setIssuedMaterials((prev) => [...prev, ...additions])
    setMaterialQuantities((prev) => ({ ...prev, [materialName]: 1 }))
    setExpandedRows((prev) => prev.filter((r) => r !== materialName))
    toast.success('Dodano materiał do zwrotu.')
  }

  const handleClearAll = () => {
    setIssuedDevices([])
    setIssuedMaterials([])
    setDamagedByDeviceId({})
    setNotes('')
    setClearConfirmOpen(false)
  }

  const removeDevice = (deviceId: string) => {
    setIssuedDevices((prev) => prev.filter((d) => d.id !== deviceId))
    setDamagedByDeviceId((prev) => {
      const next = { ...prev }
      delete next[deviceId]
      return next
    })
  }

  const removeMaterialByName = (name: string) => {
    setIssuedMaterials((prev) => prev.filter((m) => m.name !== name))
  }

  const handleReturn = async () => {
    if (!technicianId) return
    if (issuedDevices.length === 0 && issuedMaterials.length === 0) {
      return toast.error('Brak pozycji do zwrotu.')
    }

    setLoading(true)
    try {
      await returnMutation.mutateAsync({
        items: [
          ...issuedDevices.map((d) => ({
            id: d.id,
            type: 'DEVICE' as const,
            isDamaged: damagedByDeviceId[d.id] ?? false,
          })),
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

      await Promise.all([
        utils.opl.warehouse.getDefinitionsWithStock.invalidate({
          itemType: 'DEVICE',
          locationId: activeLocationId ?? undefined,
        }),
        utils.opl.warehouse.getDefinitionsWithStock.invalidate({
          itemType: 'MATERIAL',
          locationId: activeLocationId ?? undefined,
        }),
      ])
    } catch {
      toast.error('Błąd przy zwrocie.')
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const groupedIssuedMaterials = issuedMaterials.reduce<
    Record<string, { name: string; quantity: number }>
  >((acc, item) => {
    if (!acc[item.name]) acc[item.name] = { name: item.name, quantity: 0 }
    acc[item.name].quantity += item.quantity
    return acc
  }, {})

  return (
    <div className="grid h-auto gap-4 md:h-full md:min-h-0 md:grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.6fr)_minmax(300px,0.6fr)]">
      <section className="rounded-xl border p-4 overflow-y-auto">
        <div className="space-y-4">
          <OplTechnicianSelector
            value={selectedTechnician}
            onChange={(tech) => {
              setTechnicianId(tech?.id ?? null)
              setSearch('')
              setIssuedDevices([])
              setIssuedMaterials([])
              setDamagedByDeviceId({})
              setNotes('')
            }}
          />

          {technicianId && (
            <OplSerialScanInput
              onAdd={handleAddDevice}
              devices={availableReturnDevices}
              validStatuses={['ASSIGNED', 'COLLECTED_FROM_CLIENT']}
              isDeviceUsed={(id) => issuedDevices.some((d) => d.id === id)}
              strictSource="WAREHOUSE"
              successMessages={{
                local: 'Dodano urządzenie do zwrotu.',
                warehouse: 'Dodano urządzenie do zwrotu.',
              }}
            />
          )}

          {technicianId && (
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
                  const assignedQty = sumOplTechnicianMaterialStock(
                    warehouse,
                    technicianId,
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
                            variant="default"
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
          )}
        </div>
      </section>

      <section className="rounded-xl border p-4 md:flex md:flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Urządzenia</h3>
          <span className="text-muted-foreground">({issuedDevices.length})</span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
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
                      Typ: {oplDevicesTypeMap[d.category]} | SN: {d.serialNumber}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <Checkbox
                        checked={damagedByDeviceId[d.id] ?? false}
                        onCheckedChange={(checked) =>
                          setDamagedByDeviceId((prev) => ({
                            ...prev,
                            [d.id]: checked === true,
                          }))
                        }
                      />
                      Uszkodzony
                    </label>
                    {damagedByDeviceId[d.id] && (
                      <Badge variant="danger">USZKODZONY</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:text-danger hover:bg-danger/10"
                      onClick={() => removeDevice(d.id)}
                    >
                      <FaTrashAlt className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border p-4 md:flex md:flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Materiały</h3>
          <span className="text-muted-foreground">
            ({Object.keys(groupedIssuedMaterials).length})
          </span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          {Object.keys(groupedIssuedMaterials).length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak materiałów do zwrotu.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {Object.values(groupedIssuedMaterials).map((m) => (
                <div
                  key={m.name}
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
                    onClick={() => removeMaterialByName(m.name)}
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

export default OplReturnFromTechnician
