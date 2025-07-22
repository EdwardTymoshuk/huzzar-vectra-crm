'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Textarea } from '@/app/components/ui/textarea'
import { orderFailureReasons } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { getSettlementWorkCodes } from '@/utils/getSettlementWorkCodes'
import { trpc } from '@/utils/trpc'
import { Order, OrderStatus, OrderType } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import DeviceSummaryRow from './DeviceSummaryRow'
import { InstallationSection } from './InstallationSection'
import MaterialSelector from './MaterialSelector'
import { ServicesSection } from './ServicesSection'

type Props = {
  open: boolean
  onCloseAction: () => void
  order: Order
  orderType: OrderType
}

/**
 * CompleteOrderModal
 * -----------------------------------------------------------------
 * Technician modal for order completion.
 * - For installation: services, installation elements, materials, work codes.
 * - For service/outage: equipment selection (serial number), materials, notes.
 * - No work codes or installation elements for SERVICE/OUTAGE.
 */
export const CompleteOrderModal = ({
  open,
  onCloseAction,
  order,
  orderType,
}: Props) => {
  // Local state
  const [status, setStatus] = useState<OrderStatus>('COMPLETED')
  const [notes, setNotes] = useState('')
  const [failureReason, setFailureReason] = useState('')
  const [activatedServices, setActivatedServices] = useState<
    ActivatedService[]
  >([])
  const [install, setInstall] = useState({ pion: 0, listwa: 0 })
  const [materials, setMaterials] = useState<
    { id: string; quantity: number }[]
  >([])

  // State for selected equipment (for service/outage only)
  const [selectedDevices, setSelectedDevices] = useState<IssuedItemDevice[]>([])

  // Load technician's stock
  const { data: technicianDevices, isLoading: loadingDevices } =
    trpc.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
      itemType: 'DEVICE',
    })
  const { data: materialDefs } = trpc.materialDefinition.getAll.useQuery()
  const { data: technicianMaterials } =
    trpc.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
      itemType: 'MATERIAL',
    })
  const { data: workCodeDefs } = trpc.rateDefinition.getAllRates.useQuery()

  // Modal mutation
  const mutation = trpc.order.completeOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane.')
      onCloseAction()
    },
    onError: () => toast.error('Błąd zapisu zlecenia.'),
  })

  // Validation depending on order type
  const validate = () => {
    if (
      status === 'COMPLETED' &&
      orderType === 'INSTALATION' &&
      activatedServices.length === 0
    ) {
      toast.error('Dodaj przynajmniej jedną usługę.')
      return false
    }
    if (status === 'COMPLETED' && orderType === 'INSTALATION') {
      for (const s of activatedServices) {
        if (
          s.type === 'DTV' &&
          (!s.serialNumber || s.serialNumber.length < 3)
        ) {
          toast.error('Wprowadź numer seryjny dekodera.')
          return false
        }
        if (
          s.type === 'DTV' &&
          s.deviceType === 'DECODER_2_WAY' &&
          (!s.usDbmDown || !s.usDbmUp)
        ) {
          toast.error('Uzupełnij pomiary DS/US dla dekodera 2-way.')
          return false
        }
        if (
          s.type === 'NET' &&
          (!s.serialNumber || s.serialNumber.length < 3)
        ) {
          toast.error('Wprowadź numer seryjny modemu.')
          return false
        }
        if (
          s.type === 'NET' &&
          order.operator === 'TMPL' &&
          (!s.serialNumber2 || s.serialNumber2.length < 3)
        ) {
          toast.error('Wprowadź numer seryjny routera.')
          return false
        }
        if (s.type === 'NET' && !s.speedTest) {
          toast.error('Wprowadź pomiar prędkości dla NET.')
          return false
        }
      }
    }
    if (
      status === 'COMPLETED' &&
      orderType !== 'INSTALATION' &&
      selectedDevices.length === 0
    ) {
      toast.error('Dodaj przynajmniej jedno urządzenie.')
      return false
    }
    if (status === 'NOT_COMPLETED' && !failureReason) {
      toast.error('Wybierz powód niewykonania.')
      return false
    }
    return true
  }

  // Add device (for service/outage)
  const handleAddDevice = (device: IssuedItemDevice) => {
    if (selectedDevices.some((d) => d.id === device.id)) {
      toast.error('To urządzenie zostało już dodane.')
      return
    }
    setSelectedDevices((prev) => [...prev, device])
  }

  // Remove device
  const handleRemoveDevice = (id: string) => {
    setSelectedDevices((prev) => prev.filter((d) => d.id !== id))
  }

  // Prepare and send mutation
  const handleSubmit = () => {
    if (!validate()) return

    let equipmentIds: string[] = []
    let workCodes: { code: string; quantity: number }[] | undefined

    if (orderType === 'INSTALATION') {
      if (!workCodeDefs) {
        toast.error('Nie załadowano kodów pracy.')
        return
      }
      equipmentIds = activatedServices
        .flatMap((s) => [s.deviceId, s.deviceId2])
        .filter(Boolean) as string[]
      workCodes = getSettlementWorkCodes(
        activatedServices,
        workCodeDefs,
        install
      )
    } else {
      equipmentIds = selectedDevices.map((d) => d.id)
      workCodes = undefined
    }

    mutation.mutate({
      orderId: order.id,
      status,
      notes: notes || null,
      failureReason: status === 'NOT_COMPLETED' ? failureReason : null,
      workCodes,
      equipmentIds,
      usedMaterials: materials,
    })
  }

  // Devices for SerialScanInput
  const devices = (technicianDevices ?? [])
    .filter((d) => d.category)
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
    }))

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent
        className="
          max-w-lg md:max-w-2xl w-[95vw] min-w-0
          flex flex-col gap-4
          overflow-x-hidden
        "
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Zakończ zlecenie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 w-full">
          {/* Status toggle */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={status === 'COMPLETED' ? 'default' : 'outline'}
              onClick={() => setStatus('COMPLETED')}
            >
              Wykonane
            </Button>
            <Button
              variant={status === 'NOT_COMPLETED' ? 'default' : 'outline'}
              onClick={() => setStatus('NOT_COMPLETED')}
            >
              Niewykonane
            </Button>
          </div>

          {/* Main content */}
          {status === 'COMPLETED' ? (
            loadingDevices ? (
              <div className="animate-pulse h-12 bg-muted rounded" />
            ) : (
              <>
                {orderType === 'INSTALATION' ? (
                  <>
                    <h4 className="font-semibold">Uruchomione usługi</h4>
                    <ServicesSection
                      operator={order.operator}
                      devices={devices}
                      value={activatedServices}
                      onChangeAction={setActivatedServices}
                    />
                    <h4 className="font-semibold">Instalacja</h4>
                    <InstallationSection
                      activatedServices={activatedServices}
                      value={install}
                      onChangeAction={setInstall}
                    />
                  </>
                ) : (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Urządzenia</h4>
                    <SerialScanInput
                      devices={devices}
                      onAddDevice={handleAddDevice}
                      variant="block"
                    />
                    {selectedDevices.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {selectedDevices.map((device) => (
                          <DeviceSummaryRow
                            key={device.id}
                            device={device}
                            onRemove={handleRemoveDevice}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <h4 className="font-semibold">Zużyty materiał</h4>
                <MaterialSelector
                  selected={materials}
                  setSelected={setMaterials}
                  materials={materialDefs ?? []}
                  technicianStock={technicianMaterials ?? []}
                />
              </>
            )
          ) : (
            <Select value={failureReason} onValueChange={setFailureReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz powód niewykonania" />
              </SelectTrigger>
              <SelectContent>
                {orderFailureReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            placeholder="Uwagi (opcjonalnie)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="z-0"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz i zakończ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOrderModal
