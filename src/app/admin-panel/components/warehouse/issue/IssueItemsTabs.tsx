'use client'

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
import WarehouseSelectedItemsPanel from '../WarehouseSelectedItemsPanel'
import MaterialIssueTable from './MaterialIssueTable'
import SerialScanInput from './SerialScanInput'

type Props = {
  technicianId: string
}

/**
 * IssueItemsTabs:
 * - Tab layout with separate sections for device and material issuance.
 * - Handles local state for added devices/materials.
 * - Performs issue mutation on confirmation.
 */
const IssueItemsTabs = ({ technicianId }: Props) => {
  const [devices, setDevices] = useState<IssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<IssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')

  const utils = trpc.useUtils()
  const { mutate: issueMany, isLoading: isIssuing } =
    trpc.warehouse.issueItems.useMutation({
      onSuccess: () => {
        toast.success('Sprzęt wydany do technika')
        setDevices([])
        setMaterials([])
        setNotes('')
        utils.warehouse.getAll.invalidate()
      },
      onError: () => {
        toast.error('Nie udało się wydać sprzętu.')
      },
    })

  const handleAddDevice = (device: IssuedItemDevice) => {
    if (!devices.find((d) => d.id === device.id)) {
      setDevices((prev) => [...prev, device])
    }
  }

  const handleAddMaterial = (newMaterial: IssuedItemMaterial) => {
    setMaterials((prev) => {
      const existing = prev.find((m) => m.id === newMaterial.id)
      if (existing) {
        return prev.map((m) =>
          m.id === newMaterial.id
            ? { ...m, quantity: m.quantity + newMaterial.quantity }
            : m
        )
      }
      return [...prev, newMaterial]
    })
  }

  const handleRemove = (index: number) => {
    const combined = [...devices, ...materials]
    const item = combined[index]

    if (item.type === 'DEVICE') {
      setDevices((prev) => prev.filter((d) => d.id !== item.id))
    } else {
      setMaterials((prev) => prev.filter((m) => m.id !== item.id))
    }
  }

  const handleClearAll = () => {
    setDevices([])
    setMaterials([])
  }

  const handleIssue = () => {
    if (!technicianId) return toast.error('Brak wybranego technika.')

    if (devices.length === 0 && materials.length === 0) {
      return toast.warning('Brak sprzętu do wydania.')
    }

    issueMany({
      assignedToId: technicianId,
      items: [
        ...devices.map((d) => ({
          id: d.id,
          type: 'DEVICE' as const,
          quantity: 1,
        })),
        ...materials.map((m) => ({
          id: m.id,
          type: 'MATERIAL' as const,
          quantity: m.quantity,
        })),
      ],
      notes,
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="devices" className="w-full space-y-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger
            value="devices"
            className="data-[state=active]:rounded-md"
          >
            Urządzenia
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="data-[state=active]:rounded-md"
          >
            Materiały
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <SerialScanInput onAddDevice={handleAddDevice} />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <MaterialIssueTable
            onAddMaterial={handleAddMaterial}
            issuedMaterials={materials}
            technicianId={technicianId}
          />
        </TabsContent>
      </Tabs>

      {(devices.length > 0 || materials.length > 0) && (
        <WarehouseSelectedItemsPanel
          items={[...devices, ...materials]}
          onRemoveItem={handleRemove}
          onClearAll={handleClearAll}
          onConfirm={handleIssue}
          confirmLabel="Wydaj"
          title="Do wydania"
          showNotes
          notes={notes}
          setNotes={setNotes}
          loading={isIssuing}
        />
      )}
    </div>
  )
}

export default IssueItemsTabs
