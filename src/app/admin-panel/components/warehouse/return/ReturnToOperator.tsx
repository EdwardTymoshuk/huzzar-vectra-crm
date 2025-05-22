'use client'

import SearchInput from '@/app/components/shared/SearchInput'
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
import { IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import WarehouseSelectedItemsPanel from '../WarehouseSelectedItemsPanel'

type ReturnType = 'DEVICE' | 'MATERIAL'
type Props = {
  onClose: () => void
}

const ReturnToOperator = ({ onClose }: Props) => {
  const utils = trpc.useUtils()

  const [mode, setMode] = useState<ReturnType | null>(null)
  const [serial, setSerial] = useState('')
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number>
  >({})
  const [loading, setLoading] = useState(false)

  const [issuedDevices, setIssuedDevices] = useState<IssuedItemDevice[]>([])
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedItemMaterial[]>(
    []
  )
  const [notes, setNotes] = useState('')

  const { data: warehouse = [] } = trpc.warehouse.getAll.useQuery()
  const returnMutation = trpc.warehouse.returnToOperator.useMutation()

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

    const qty = materialQuantities[id] ?? 1
    if (qty > item.quantity) return

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
        { id: item.id, type: 'MATERIAL', name: item.name, quantity: qty },
      ])
    }

    setMaterialQuantities((prev) => ({ ...prev, [id]: 1 }))
    setExpandedRows((prev) => prev.filter((r) => r !== id))
  }

  const handleRemoveItem = (index: number) => {
    const all = [...issuedDevices, ...issuedMaterials]
    const item = all[index]
    if (item.type === 'DEVICE') {
      setIssuedDevices((prev) => prev.filter((d) => d.id !== item.id))
    } else {
      setIssuedMaterials((prev) => prev.filter((m) => m.id !== item.id))
    }
  }

  const handleClearAll = () => {
    setIssuedDevices([])
    setIssuedMaterials([])
  }

  const handleReturn = async () => {
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
        notes,
      })

      toast.success('Zwrócono sprzęt do operatora.')
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
      <Select
        value={mode ?? ''}
        onValueChange={(val) => {
          setMode(val as ReturnType)
          setSerial('')
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

      {/* DEVICE RETURN */}
      {mode === 'DEVICE' && (
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
      )}

      {/* MATERIAL RETURN */}
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
                        value={materialQuantities[item.id] ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          const clamped = Math.min(val, remainingQty)
                          setMaterialQuantities((prev) => ({
                            ...prev,
                            [item.id]: clamped,
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
                      variant="success"
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

export default ReturnToOperator
