'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import TechnicianSelector from '@/app/components/shared/TechnicianSelector'
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
import { sumTechnicianMaterialStock } from '@/lib/warehouse'
import { IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { WarehouseStatus } from '@prisma/client'
import { useMemo, useRef, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import WarehouseSelectedItemsPanel from '../../../../components/shared/warehouse/WarehouseSelectedItemsPanel'

type Props = {
  onClose: () => void
}

const ReturnFromTechnician = ({ onClose }: Props) => {
  const utils = trpc.useUtils()

  // State
  const [technicianId, setTechnicianId] = useState<string | null>(null)
  const [returnType, setReturnType] = useState<'DEVICE' | 'MATERIAL' | null>(
    null
  )
  const [serial, setSerial] = useState('')
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number | undefined>
  >({})
  const [loading, setLoading] = useState(false)

  const [issuedDevices, setIssuedDevices] = useState<IssuedItemDevice[]>([])
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedItemMaterial[]>(
    []
  )
  const [notes, setNotes] = useState('')

  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })
  const selectedTechnician = useMemo(
    () => technicians.find((t) => t.id === technicianId) ?? null,
    [technicians, technicianId]
  )

  const activeLocationId = useActiveLocation()

  const { data: warehouse = [] } = trpc.warehouse.getItemsForReturn.useQuery({
    locationId: activeLocationId ?? undefined,
    technicianId: technicianId ?? undefined,
  })

  const returnMutation = trpc.warehouse.returnToWarehouse.useMutation()

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

  // Add material to return list
  const handleAddMaterial = (materialName: string) => {
    const technicianQty = sumTechnicianMaterialStock(
      warehouse,
      technicianId!,
      materialName
    )
    const alreadyAddedQty =
      issuedMaterials.find((m) => m.name === materialName)?.quantity ?? 0

    const qty = materialQuantities[materialName]
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }
    if (qty > technicianQty - alreadyAddedQty) {
      toast.warning('Nie można zwrócić więcej niż technik posiada.')
      return
    }

    const existing = issuedMaterials.find((m) => m.name === materialName)
    if (existing) {
      setIssuedMaterials((prev) =>
        prev.map((m) =>
          m.name === materialName ? { ...m, quantity: m.quantity + qty } : m
        )
      )
    } else {
      setIssuedMaterials((prev) => [
        ...prev,
        {
          id: '',
          type: 'MATERIAL',
          name: materialName,
          quantity: qty,
          materialDefinitionId: '',
        },
      ])
    }

    setMaterialQuantities((prev) => ({ ...prev, [materialName]: 1 }))
    setExpandedRows((prev) => prev.filter((r) => r !== materialName))
  }

  // Remove item from return list
  const handleRemoveItem = (index: number) => {
    const all = [...issuedDevices, ...issuedMaterials]
    const item = all[index]
    if (item.type === 'DEVICE') {
      setIssuedDevices((prev) => prev.filter((d) => d.id !== item.id))
    } else {
      setIssuedMaterials((prev) => prev.filter((m) => m.name !== item.name))
    }
  }

  // Clear all return items
  const handleClearAll = () => {
    setIssuedDevices([])
    setIssuedMaterials([])
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
    const acceptable: WarehouseStatus[] = ['ASSIGNED', 'COLLECTED_FROM_CLIENT']
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
            id: '', // handled by backend using name
            name: m.name,
            type: 'MATERIAL' as const,
            quantity: m.quantity,
          })),
        ],
        notes,
      })

      toast.success('Zwrot przyjęty.')
      handleClearAll()
      await utils.warehouse.getAll.invalidate()
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
      <TechnicianSelector
        value={selectedTechnician}
        onChange={(tech) => {
          setTechnicianId(tech?.id ?? null)
          setSearch('')
          setReturnType(null)
          setSerial('')
        }}
      />

      {/* Type selector */}
      {technicianId && (
        <Select
          value={returnType ?? ''}
          onValueChange={(val) => setReturnType(val as 'DEVICE' | 'MATERIAL')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Co chcesz zwrócić?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEVICE">Urządzenie</SelectItem>
            <SelectItem value="MATERIAL">Materiał</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Device return input */}
      {technicianId && returnType === 'DEVICE' && (
        <div className="flex gap-2">
          <Input
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
      )}

      {/* Material return list */}
      {technicianId && returnType === 'MATERIAL' && (
        <div className="space-y-3">
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
              const alreadyReturned = issuedMaterials.find(
                (m) => m.name === materialName
              )
              const remainingQty =
                assignedQty - (alreadyReturned?.quantity || 0)

              return (
                <div
                  key={materialName}
                  className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${
                    remainingQty === 0 ? 'opacity-50 pointer-events-none' : ''
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
                      variant="success"
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

      {/* Summary list and return button */}
      {(issuedDevices.length > 0 || issuedMaterials.length > 0) && (
        <WarehouseSelectedItemsPanel
          items={[...issuedDevices, ...issuedMaterials]}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleClearAll}
          onConfirm={handleReturn}
          confirmLabel="Zwróć"
          title="Do zwrotu"
          showNotes
          notes={notes}
          setNotes={setNotes}
          loading={loading}
        />
      )}
    </div>
  )
}

export default ReturnFromTechnician
