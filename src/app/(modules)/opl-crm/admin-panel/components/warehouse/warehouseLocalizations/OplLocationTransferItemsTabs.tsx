'use client'
import OplMaterialTransferTable from '@/app/(modules)/opl-crm/components/warehouse/OplMaterialTransferTable'
import WarehouseSelectedItemsPanel from '@/app/(modules)/opl-crm/components/warehouse/WarehouseSelectedItemsPanel'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import {
  OplDeviceBasic,
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
} from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
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
}: Props) => {
  const [devices, setDevices] = useState<OplIssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<OplIssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')

  /** Load available devices from the source warehouse */
  const { data: warehouseDevices = [] } = trpc.opl.warehouse.getAll.useQuery({
    locationId: fromLocationId,
    itemType: 'DEVICE',
  })

  const availableDevices: OplDeviceBasic[] = warehouseDevices
    .filter((d) => d.status === 'AVAILABLE')
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="devices" className="mb-10">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="devices">Urządzenia</TabsTrigger>
          <TabsTrigger value="materials">Materiały</TabsTrigger>
        </TabsList>

        {/* Devices tab */}
        <TabsContent value="devices">
          <OplSerialScanInput
            onAddDevice={addDevice}
            devices={availableDevices}
            mode="ISSUE"
          />
        </TabsContent>

        {/* Materials tab */}
        <TabsContent value="materials">
          <OplMaterialTransferTable
            fromLocationId={fromLocationId}
            onAdd={addMaterial}
            picked={materials}
          />
        </TabsContent>
      </Tabs>

      {/* Selected items summary */}
      {(devices.length > 0 || materials.length > 0) && (
        <WarehouseSelectedItemsPanel
          items={[...devices, ...materials]}
          title="Do przekazania"
          confirmLabel="Przekaż"
          onRemoveItem={remove}
          onClearAll={clear}
          onConfirm={confirm}
          notes={notes}
          setNotes={setNotes}
          loading={loading}
          showNotes
        />
      )}
    </div>
  )
}

export default OplLocationTransferItemsTabs
