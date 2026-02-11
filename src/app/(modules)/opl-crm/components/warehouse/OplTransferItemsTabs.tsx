'use client'

import WarehouseSelectedItemsPanel from '@/app/(modules)/opl-crm/components/warehouse/WarehouseSelectedItemsPanel'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import {
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
  OplTechnicianStockDeviceItem,
} from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import OplSerialScanInput from '../../admin-panel/components/warehouse/issue/OplSerialScanInput'
import OplMaterialTransferTable from './OplMaterialTransferTable'

interface Props {
  technicianId: string
  onClose: () => void
}

/**
 * OplTransferItemsTabs
 * – local state for newly added devices / materials
 * – calls `warehouse.transfer.requestTransfer` once confirmed
 */
const OplTransferItemsTabs = ({ technicianId, onClose }: Props) => {
  const [devices, setDevices] = useState<OplIssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<OplIssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')

  const utils = trpc.useUtils()
  const { mutate: request, isLoading } =
    trpc.opl.warehouse.requestOplTechTransfer.useMutation({
      onSuccess: () => {
        utils.opl.warehouse.getTechnicianStock.invalidate({
          technicianId: 'self',
        })
        utils.opl.warehouse.getOplIncomingTechTransfers.invalidate()
        toast.success('Sprzęt został przekazany – czeka na akceptację.')
        setDevices([])
        setMaterials([])
        setNotes('')
        onClose()
        utils.opl.warehouse.getAll.invalidate()
      },
      onError: () => toast.error('Nie udało się przekazać sprzętu.'),
    })

  const { data: myDevices = [] } =
    trpc.opl.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
      itemType: 'DEVICE',
    })

  const deviceOptions = myDevices
    .filter((d): d is OplTechnicianStockDeviceItem => d.itemType === 'DEVICE')
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
      status: d.status,
      deviceDefinitionId: d.deviceDefinitionId,
    }))

  /* ---------- add / remove helpers (same logic as IssueItemsTabs) ---------- */
  const addDevice = (d: OplIssuedItemDevice) =>
    setDevices((prev) =>
      prev.find((x) => x.id === d.id) ? prev : [...prev, d]
    )

  const addMaterial = (m: OplIssuedItemMaterial) =>
    setMaterials((prev) => {
      const ex = prev.find((x) => x.id === m.id)
      return ex
        ? prev.map((x) =>
            x.id === m.id ? { ...x, quantity: x.quantity + m.quantity } : x
          )
        : [...prev, m]
    })

  const remove = (idx: number) => {
    const combo = [...devices, ...materials]
    const item = combo[idx]
    if (item.type === 'DEVICE')
      setDevices((d) => d.filter((x) => x.id !== item.id))
    else setMaterials((m) => m.filter((x) => x.id !== item.id))
  }

  const clear = () => {
    setDevices([])
    setMaterials([])
  }

  const confirm = () => {
    if (devices.length === 0 && materials.length === 0)
      return toast.warning('Brak sprzętu do przekazania.')

    request({
      newTechnicianId: technicianId,
      items: [
        ...devices.map((d) => ({ itemId: d.id })),
        ...materials.map((m) => ({ itemId: m.id, quantity: m.quantity })),
      ],
      notes,
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="devices">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="devices">Urządzenia</TabsTrigger>
          <TabsTrigger value="materials">Materiały</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="pt-4">
          <OplSerialScanInput onAdd={addDevice} devices={deviceOptions} />
        </TabsContent>

        <TabsContent value="materials">
          <OplMaterialTransferTable onAdd={addMaterial} picked={materials} />
        </TabsContent>
      </Tabs>

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
          loading={isLoading}
          showNotes
        />
      )}
    </div>
  )
}

export default OplTransferItemsTabs
