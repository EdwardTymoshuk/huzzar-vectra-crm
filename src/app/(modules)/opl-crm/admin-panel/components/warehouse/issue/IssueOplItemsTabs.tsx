'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
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
import { cn } from '@/lib/utils'
import {
  OplDeviceBasic,
  OplIssuedItemDevice,
  OplIssuedItemMaterial,
} from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { FaTrashAlt } from 'react-icons/fa'
import { toast } from 'sonner'
import MaterialIssueTable from './MaterialIssueTable'
import OplSerialScanInput from './OplSerialScanInput'

type Props = {
  technicianId: string
  onCloseAction: () => void
  onDraftChange?: (hasDraft: boolean) => void
}

/**
 * IssueOplItemsTabs:
 * - Tab layout with separate sections for device and material issuance.
 * - Handles local state for added devices/materials.
 * - Performs issue mutation on confirmation.
 */
const IssueOplItemsTabs = ({
  technicianId,
  onCloseAction,
  onDraftChange,
}: Props) => {
  const [devices, setDevices] = useState<OplIssuedItemDevice[]>([])
  const [materials, setMaterials] = useState<OplIssuedItemMaterial[]>([])
  const [notes, setNotes] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  useEffect(() => {
    onDraftChange?.(
      devices.length > 0 || materials.length > 0 || notes.trim().length > 0
    )
  }, [devices, materials, notes, onDraftChange])

  const utils = trpc.useUtils()
  const { mutate: issueMany, isLoading: isIssuing } =
    trpc.opl.warehouse.issueItems.useMutation({
      onSuccess: async () => {
        const locationId = activeLocationId ?? undefined

        toast.success('Sprzęt wydany do technika')

        await utils.opl.warehouse.getDefinitionsWithStock.refetch({
          itemType: 'DEVICE',
          locationId,
        })

        setDevices([])
        setMaterials([])
        setNotes('')
        onCloseAction()
      },
      onError: () => {
        toast.error('Nie udało się wydać sprzętu.')
      },
    })

  const activeLocationId = useActiveLocation()

  const { data: warehouseDevices = [] } = trpc.opl.warehouse.getAll.useQuery(
    activeLocationId
      ? { locationId: activeLocationId, itemType: 'DEVICE' as const }
      : undefined,
    { enabled: !!activeLocationId }
  )

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
  const handleAddDevice = (device: OplIssuedItemDevice) => {
    if (!devices.find((d) => d.id === device.id)) {
      setDevices((prev) => [...prev, device])
    }
  }

  const handleAddMaterial = (newMaterial: OplIssuedItemMaterial) => {
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

  const removeDevice = (deviceId: string) => {
    const index = [...devices, ...materials].findIndex(
      (item) => item.type === 'DEVICE' && item.id === deviceId
    )
    if (index >= 0) handleRemove(index)
  }

  const removeMaterial = (materialId: string) => {
    const index = [...devices, ...materials].findIndex(
      (item) => item.type === 'MATERIAL' && item.id === materialId
    )
    if (index >= 0) handleRemove(index)
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
    <div className="grid h-auto gap-4 md:h-full md:min-h-0 md:grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.6fr)_minmax(300px,0.6fr)]">
      <section className="rounded-xl border p-4 min-h-0 overflow-y-auto">
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Urządzenia</h3>
              <p className="text-sm text-muted-foreground">
                Wpisz lub zeskanuj numer seryjny urządzenia do wydania.
              </p>
            </div>
            <OplSerialScanInput
              onAdd={handleAddDevice}
              devices={availableDevices}
              isDeviceUsed={(id) => devices.some((d) => d.id === id)}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Materiały</h3>
              <p className="text-sm text-muted-foreground">
                Wyszukaj materiał i dodaj ilość do wydania.
              </p>
            </div>
            <MaterialIssueTable
              onAddMaterial={handleAddMaterial}
              issuedMaterials={materials}
              technicianId={technicianId}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 md:flex md:flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Wydane urządzenia</h3>
          <span className="text-muted-foreground">({devices.length})</span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak wydanych urządzeń.
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
          <h3 className="text-base font-semibold">Wydane materiały</h3>
          <span className="text-muted-foreground">({materials.length})</span>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Brak wydanych materiałów.
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
              Uwagi do wydania (opcjonalnie)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Np. numer dokumentu wydania lub komentarz"
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
              onClick={handleIssue}
              disabled={isIssuing}
            >
              {isIssuing ? 'Wydawanie...' : 'Wydaj'}
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz wyczyścić wszystkie pozycje do wydania?
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

export default IssueOplItemsTabs
