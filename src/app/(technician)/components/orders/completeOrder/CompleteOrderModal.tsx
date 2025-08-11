'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { devicesTypeMap, orderFailureReasons } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { getErrMessage } from '@/utils/errorHandler'
import { getSettlementWorkCodes } from '@/utils/getSettlementWorkCodes'
import { trpc } from '@/utils/trpc'
import { genUUID } from '@/utils/uuid'
import { DeviceCategory, Order, OrderStatus, OrderType } from '@prisma/client'
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

/* -------------------------------------------------------------------------- */
/*                           Complete Order Modal                             */
/* -------------------------------------------------------------------------- */
export const CompleteOrderModal = ({
  open,
  onCloseAction,
  order,
  orderType,
}: Props) => {
  /* ---------------- base/installation state ---------------- */
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

  /* ---------------- devices from technician stock ---------------- */
  const [selectedDevices, setSelectedDevices] = useState<IssuedItemDevice[]>([])
  const handleAddStockDevice = (dev: IssuedItemDevice) => {
    if (selectedDevices.some((d) => d.id === dev.id)) {
      toast.error('To urządzenie zostało już dodane.')
      return
    }
    setSelectedDevices((prev) => [...prev, dev])
  }
  const handleRemoveStockDevice = (id: string) =>
    setSelectedDevices((prev) => prev.filter((d) => d.id !== id))

  /* ---------------- devices collected from client ---------------- */
  const [collectEnabled, setCollectEnabled] = useState(false)
  const [collected, setCollected] = useState<
    {
      id: string
      name: string
      category: DeviceCategory
      serialNumber: string
    }[]
  >([])

  /* form fields */
  const [collectCat, setCollectCat] = useState<DeviceCategory>('OTHER')
  const [collectName, setCollectName] = useState('')
  const [collectSN, setCollectSN] = useState('')

  const addCollected = () => {
    if (collectName.trim().length < 2) {
      toast.error('Podaj nazwę urządzenia.')
      return
    }
    if (collectSN.trim().length < 3) {
      toast.error('Podaj numer seryjny.')
      return
    }
    setCollected((prev) => [
      ...prev,
      {
        id: genUUID(),
        name: collectName.trim(),
        category: collectCat,
        serialNumber: collectSN.trim().toUpperCase(),
      },
    ])
    setCollectName('')
    setCollectSN('')
  }
  const removeCollected = (id: string) =>
    setCollected((prev) => prev.filter((d) => d.id !== id))

  /* ---------------- queries ---------------- */
  const { data: techDevices = [], isLoading: loadingDevices } =
    trpc.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
      itemType: 'DEVICE',
    })

  const { data: materialDefs } = trpc.materialDefinition.getAll.useQuery()
  const { data: techMaterials } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'MATERIAL',
  })
  const { data: workCodeDefs } = trpc.rateDefinition.getAllRates.useQuery()

  /* stock devices for SerialScanInput */
  const stockOptions = techDevices
    .filter((d) => d.category)
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
    }))

  /* ---------------- validation + submit ---------------- */
  const validate = () => {
    if (
      status === 'COMPLETED' &&
      orderType === 'INSTALATION' &&
      activatedServices.length === 0
    ) {
      toast.error('Dodaj przynajmniej jedną usługę.')
      return false
    }

    if (
      status === 'COMPLETED' &&
      orderType !== 'INSTALATION' &&
      selectedDevices.length === 0 &&
      (!collectEnabled || collected.length === 0)
    ) {
      toast.error(
        'Dodaj przynajmniej jedno urządzenie (użyte lub odebrane od klienta).'
      )
      return false
    }

    if (collectEnabled && collected.length === 0) {
      toast.error(
        'Dodaj urządzenia odebrane od klienta lub wyłącz przełącznik.'
      )
      return false
    }

    if (status === 'NOT_COMPLETED' && !failureReason) {
      toast.error('Wybierz powód niewykonania.')
      return false
    }
    return true
  }

  const mutation = trpc.order.completeOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane.')
      onCloseAction()
    },
    onError: (err) => {
      toast.error('Błąd zapisu zlecenia.', {
        description: getErrMessage(err),
      })
    },
  })

  const submit = () => {
    if (!validate()) return

    const equipmentIds =
      orderType === 'INSTALATION'
        ? (activatedServices
            .flatMap((s) => [s.deviceId, s.deviceId2])
            .filter(Boolean) as string[])
        : selectedDevices.map((d) => d.id)

    const workCodes =
      orderType === 'INSTALATION'
        ? getSettlementWorkCodes(activatedServices, workCodeDefs ?? [], install)
        : undefined

    mutation.mutate({
      orderId: order.id,
      status,
      notes: notes || null,
      failureReason: status === 'NOT_COMPLETED' ? failureReason : null,
      workCodes,
      equipmentIds,
      usedMaterials: materials,
      collectedDevices: collectEnabled ? collected : [],
      services: Array.isArray(activatedServices) ? activatedServices : [],
    })
  }

  /* ---------------- render ---------------- */
  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-lg md:max-w-2xl w-[95vw] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Zakończ zlecenie</DialogTitle>
        </DialogHeader>

        {/* ---------------- STATUS toggle ---------------- */}
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

        {/* ================  COMPLETED  ================ */}
        {status === 'COMPLETED' ? (
          loadingDevices ? (
            <div className="animate-pulse h-12 bg-muted rounded" />
          ) : (
            <>
              {/* INSTALLATION sections */}
              {orderType === 'INSTALATION' && (
                <>
                  <h4 className="font-semibold">Uruchomione usługi</h4>
                  <ServicesSection
                    operator={order.operator}
                    devices={stockOptions}
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
              )}

              {/* Toggle + collected */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="collect-switch"
                    checked={collectEnabled}
                    onCheckedChange={setCollectEnabled}
                  />
                  <label htmlFor="collect-switch" className="font-semibold">
                    Odebrałem sprzęt od klienta
                  </label>
                </div>

                {collectEnabled && (
                  <>
                    {/* mini-form */}
                    <div className="flex flex-col md:flex-row gap-2">
                      <Select
                        value={collectCat}
                        onValueChange={(v) =>
                          setCollectCat(v as DeviceCategory)
                        }
                      >
                        <SelectTrigger className="w-full md:w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(DeviceCategory).map((category) => (
                            <SelectItem key={category} value={category}>
                              {devicesTypeMap[category]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Nazwa urządzenia"
                        value={collectName}
                        onChange={(e) => setCollectName(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Numer seryjny"
                        value={collectSN}
                        onChange={(e) => setCollectSN(e.target.value)}
                        className="flex-1 md:w-44 [text-transform:uppercase]"
                      />
                      <Button
                        onClick={addCollected}
                        disabled={!collectSN.trim()}
                      >
                        Dodaj
                      </Button>
                    </div>

                    {/* list */}
                    {collected.map((d) => (
                      <DeviceSummaryRow
                        key={d.id}
                        device={{
                          id: d.id,
                          type: 'DEVICE',
                          name: d.name,
                          serialNumber: d.serialNumber,
                          category: d.category,
                        }}
                        onRemove={() => removeCollected(d.id)}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Materials */}
              <h4 className="font-semibold mt-4">Zużyty materiał</h4>
              <MaterialSelector
                selected={materials}
                setSelected={setMaterials}
                materials={materialDefs ?? []}
                technicianStock={techMaterials ?? []}
              />
            </>
          )
        ) : (
          /* ================  NOT COMPLETED  ================ */
          <Select value={failureReason} onValueChange={setFailureReason}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz powód niewykonania" />
            </SelectTrigger>
            <SelectContent>
              {orderFailureReasons.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Notes */}
        <Textarea
          placeholder="Uwagi (opcjonalnie)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz i zakończ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOrderModal
