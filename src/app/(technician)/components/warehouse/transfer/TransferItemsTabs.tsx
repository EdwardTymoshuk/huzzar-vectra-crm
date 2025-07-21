'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import WarehouseSelectedItemsPanel from '@/app/components/shared/warehouse/WarehouseSelectedItemsPanel'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import MaterialTransferTable from './MaterialTransferTable'

interface Props {
  technicianId: string
  onClose: () => void
}

/**
 * TransferItemsTabs
 * – local state for newly added devices / materials
 * – calls `warehouse.transfer.requestTransfer` once confirmed
 */
const TransferItemsTabs = ({ technicianId, onClose }: Props) => {
  const [devices, setDevices] = useState<IssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<IssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')

  const utils = trpc.useUtils()
  const { mutate: request, isLoading } =
    trpc.warehouse.requestTransfer.useMutation({
      onSuccess: () => {
        utils.warehouse.getTechnicianStock.invalidate({ technicianId: 'self' })
        utils.warehouse.getIncomingTransfers.invalidate()
        toast.success('Sprzęt został przekazany – czeka na akceptację.')
        setDevices([])
        setMaterials([])
        setNotes('')
        onClose()
        utils.warehouse.getAll.invalidate()
      },
      onError: () => toast.error('Nie udało się przekazać sprzętu.'),
    })

  const { data: myDevices = [] } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })

  /* ---------- add / remove helpers (same logic as IssueItemsTabs) ---------- */
  const addDevice = (d: IssuedItemDevice) =>
    setDevices((prev) =>
      prev.find((x) => x.id === d.id) ? prev : [...prev, d]
    )

  const addMaterial = (m: IssuedItemMaterial) =>
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

        <TabsContent value="devices">
          <SerialScanInput
            onAddDevice={addDevice}
            devices={myDevices}
            validStatuses={['ASSIGNED']}
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialTransferTable onAdd={addMaterial} picked={materials} />
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

export default TransferItemsTabs
