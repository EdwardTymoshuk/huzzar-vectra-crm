'use client'
import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import OplMaterialTransferTable from '@/app/(modules)/opl-crm/components/warehouse/OplMaterialTransferTable'
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
  Badge,
} from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import {
  OplDeviceBasic,
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
} from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { FaTrashAlt } from 'react-icons/fa'
import { toast } from 'sonner'
import OplSerialScanInput from '../issue/OplSerialScanInput'

interface Props {
  /** Source warehouse location (items will be taken from here) */
  fromLocationId: string
  /** Target warehouse location (used only when confirming transfer) */
  toLocationId: string
  /** Callback to propagate confirmed items + notes to parent (modal) */
  onConfirm: (
    items: Array<
      | { itemType: 'DEVICE'; warehouseItemId: string }
      | { itemType: 'MATERIAL'; materialDefinitionId: string; quantity: number }
    >,
    notes: string
  ) => void
  /** Loading state passed down from parent mutation */
  loading: boolean
  onDraftChange?: (hasDraft: boolean) => void
}

/**
 * OplLocationTransferItemsTabs
 * ---------------------------------------------------------
 * • Allows user to select devices (scanned) and materials
 *   from a given warehouse location.
 * • Keeps local state of selected items and notes.
 * • Delegates final confirmation (onConfirm) to parent.
 */
const OplLocationTransferItemsTabs = ({
  fromLocationId,
  onConfirm,
  loading,
  onDraftChange,
}: Props) => {
  const [devices, setDevices] = useState<OplIssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<OplIssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  /** Load available devices from the source warehouse */
  const { data: warehouseDevices = [] } = trpc.opl.warehouse.getAll.useQuery({
    locationId: fromLocationId,
    itemType: 'DEVICE',
  })

  const availableDevices: OplDeviceBasic[] = warehouseDevices
    .filter((d) => d.status === 'AVAILABLE')
    .filter((d) => !devices.some((pickedDevice) => pickedDevice.id === d.id))
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
      deviceDefinitionId: d.deviceDefinitionId,
    }))
  /** Add a new device to the transfer list */
  const addDevice = (d: OplIssuedItemDevice) =>
    setDevices((prev) =>
      prev.find((x) => x.id === d.id) ? prev : [...prev, d]
    )

  /** Add material (with quantity merge if already picked) */
  const addMaterial = (m: OplIssuedItemMaterial) =>
    setMaterials((prev) => {
      const ex = prev.find((x) => x.id === m.id)
      return ex
        ? prev.map((x) =>
            x.id === m.id ? { ...x, quantity: x.quantity + m.quantity } : x
          )
        : [...prev, m]
    })

  /** Remove an item (device or material) by index in combined list */
  const remove = (idx: number) => {
    const combo = [...devices, ...materials]
    const item = combo[idx]
    if ('serialNumber' in item) {
      setDevices((d) => d.filter((x) => x.id !== item.id))
    } else {
      setMaterials((m) => m.filter((x) => x.id !== item.id))
    }
  }

  /** Clear all currently selected items */
  const clear = () => {
    setDevices([])
    setMaterials([])
    setNotes('')
    setClearConfirmOpen(false)
  }

  /** Confirm transfer: pass items and notes to parent */
  const confirm = () => {
    if (devices.length === 0 && materials.length === 0) {
      toast.warning('Brak sprzętu do przekazania.')
      return
    }

    const items = [
      ...devices.map((d) => ({
        itemType: 'DEVICE' as const,
        warehouseItemId: d.id,
      })),
      ...materials.map((m) => ({
        itemType: 'MATERIAL' as const,
        materialDefinitionId: m.materialDefinitionId!,
        quantity: m.quantity,
      })),
    ]

    onConfirm(items, notes)
    setDevices([])
    setMaterials([])
    setNotes('')
  }

  const removeDevice = (deviceId: string) => {
    const index = [...devices, ...materials].findIndex(
      (item) => item.type === 'DEVICE' && item.id === deviceId
    )
    if (index >= 0) remove(index)
  }

  const removeMaterial = (materialId: string) => {
    const index = [...devices, ...materials].findIndex(
      (item) => item.type === 'MATERIAL' && item.id === materialId
    )
    if (index >= 0) remove(index)
  }

  useEffect(() => {
    onDraftChange?.(
      devices.length > 0 || materials.length > 0 || notes.trim().length > 0
    )
  }, [devices, materials, notes, onDraftChange])

  return (
    <div className="grid h-auto gap-4 md:h-full md:min-h-0 md:grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.6fr)_minmax(300px,0.6fr)]">
      <section className="rounded-xl border p-4 min-h-0 overflow-y-auto">
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Urządzenia</h3>
              <p className="text-sm text-muted-foreground">
                Wpisz lub zeskanuj numer seryjny urządzenia do przekazania.
              </p>
            </div>
            <OplSerialScanInput
              onAdd={addDevice}
              devices={availableDevices}
              isDeviceUsed={(id) => devices.some((d) => d.id === id)}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Materiały</h3>
              <p className="text-sm text-muted-foreground">
                Wyszukaj materiał i dodaj ilość do przekazania.
              </p>
            </div>
            <OplMaterialTransferTable
              fromLocationId={fromLocationId}
              onAdd={addMaterial}
              picked={materials}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 md:flex md:flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Urządzenia</h3>
          <span className="text-muted-foreground">({devices.length})</span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak urządzeń do przekazania.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {devices.map((d) => (
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
        </div>
      </section>

      <section className="rounded-xl border p-4 md:flex md:flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Materiały</h3>
          <span className="text-muted-foreground">({materials.length})</span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak materiałów do przekazania.
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {materials.map((m) => (
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
              Uwagi do przekazania (opcjonalnie)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Np. powód transferu lub numer dokumentu"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(true)}
              disabled={devices.length === 0 && materials.length === 0}
            >
              Wyczyść
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={confirm}
              disabled={loading}
            >
              {loading ? 'Przekazywanie...' : 'Przekaż'}
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz wyczyścić wszystkie pozycje do przekazania?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={clear}>Wyczyść</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OplLocationTransferItemsTabs
