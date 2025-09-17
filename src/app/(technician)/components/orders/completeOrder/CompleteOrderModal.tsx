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
import { devicesTypeMap } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { getErrMessage } from '@/utils/errorHandler'
import { getSettlementWorkCodes } from '@/utils/getSettlementWorkCodes'
import { useRole } from '@/utils/roleHelpers/useRole'
import { trpc } from '@/utils/trpc'
import { genUUID } from '@/utils/uuid'
import { DeviceCategory, Order, OrderStatus, OrderType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DeviceSummaryRow from './DeviceSummaryRow'
import FailureReasonSelect from './FailureReasonSelect'
import { InstallationSection } from './InstallationSection'
import MaterialSelector from './MaterialSelector'
import ServicesSection from './ServicesSection'

// TYPES

type TechDeviceInput = {
  id: string
  name: string
  serialNumber: string | null
  category: DeviceCategory | null
}

type AssignedEquipmentInput = {
  warehouseId?: string | null
  warehouse?: {
    id: string
    name: string
    serialNumber: string | null
    category: DeviceCategory | null
    status?: string | null
  } | null
}

type ServiceDb = {
  id?: string | null
  type: ActivatedService['type']
  deviceId?: string | null
  serialNumber?: string | null
  deviceId2?: string | null
  serialNumber2?: string | null
  usDbmDown?: number | null
  usDbmUp?: number | null
  usDbmConfirmed?: boolean | null
  speedTest?: string | null
  speedTestConfirmed?: boolean | null
  notes?: string | null
  deviceType?: ActivatedService['deviceType'] | null
}

type UsedMaterialDb = { materialId?: string | null; quantity?: number | null }

type CollectedDeviceDb = {
  id?: string | null
  name?: string | null
  category?: DeviceCategory | null
  serialNumber?: string | null
}

type OrderExtras = {
  services?: ServiceDb[]
  usedMaterials?: UsedMaterialDb[]
  collectedDevices?: CollectedDeviceDb[]
  failureReason?: string | null
  assignedEquipment?: AssignedEquipmentInput[]
  settlementEntries?: { code: string; quantity: number }[]
}

// HELPERS

const isIssuedItemDevice = (x: unknown): x is IssuedItemDevice =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as { id?: unknown }).id === 'string' &&
  typeof (x as { name?: unknown }).name === 'string'

const mapTechToIssued = (
  src: readonly TechDeviceInput[] | undefined
): IssuedItemDevice[] =>
  (src ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    serialNumber: d.serialNumber ?? '',
    category: d.category ?? DeviceCategory.OTHER,
    type: 'DEVICE',
  }))

const mapAssignedToIssued = (
  src: readonly AssignedEquipmentInput[] | undefined
): IssuedItemDevice[] =>
  (src ?? []).flatMap((e) => {
    const id = e.warehouse?.id ?? e.warehouseId ?? null
    const name = e.warehouse?.name ?? null
    if (!id || !name) return []
    return [
      {
        id,
        name,
        serialNumber: e.warehouse?.serialNumber ?? '',
        category: e.warehouse?.category ?? DeviceCategory.OTHER,
        type: 'DEVICE' as const,
      },
    ]
  })

const normalizeServices = (
  src: readonly ServiceDb[] | undefined
): ActivatedService[] =>
  (src ?? []).map((o) => ({
    id: o.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    type: o.type,
    deviceId: o.deviceId ?? undefined,
    serialNumber: o.serialNumber ?? undefined,
    deviceId2: o.deviceId2 ?? undefined,
    serialNumber2: o.serialNumber2 ?? undefined,
    usDbmDown: typeof o.usDbmDown === 'number' ? o.usDbmDown : undefined,
    usDbmUp: typeof o.usDbmUp === 'number' ? o.usDbmUp : undefined,
    usDbmConfirmed: o.usDbmConfirmed ?? undefined,
    speedTest: o.speedTest ?? undefined,
    speedTestConfirmed: o.speedTestConfirmed ?? undefined,
    notes: o.notes ?? undefined,
    deviceType: o.deviceType ?? undefined,
  }))

const normalizeMaterials = (
  src: readonly UsedMaterialDb[] | undefined
): { id: string; quantity: number }[] =>
  (src ?? []).flatMap((m) =>
    m.materialId && typeof m.quantity === 'number'
      ? [{ id: m.materialId, quantity: m.quantity }]
      : []
  )

const normalizeCollected = (
  src: readonly CollectedDeviceDb[] | undefined
): {
  id: string
  name: string
  category: DeviceCategory
  serialNumber: string
}[] =>
  (src ?? []).flatMap((d) => {
    if (!d?.name || !d?.serialNumber) return []
    return [
      {
        id: d.id ?? genUUID(),
        name: d.name,
        category: d.category ?? DeviceCategory.OTHER,
        serialNumber: d.serialNumber,
      },
    ]
  })

// COMPONENT

type Props = {
  open: boolean
  onCloseAction: () => void
  order: Order
  orderType: OrderType
  mode?: 'complete' | 'amend'
}

export const CompleteOrderModal = ({
  open,
  onCloseAction,
  order,
  orderType,
  mode = 'complete',
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
  const [usedEnabled, setUsedEnabled] = useState(false)

  /* form fields */
  const [collectCat, setCollectCat] = useState<DeviceCategory>('OTHER')
  const [collectName, setCollectName] = useState('')
  const [collectSN, setCollectSN] = useState('')

  const { isAdmin, isCoordinator } = useRole()

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

  /* ---------------- merge stock + already-assigned ---------------- */
  const oExtra: Order & OrderExtras = order as Order & OrderExtras

  const extractInstallFromSettlement = (
    entries: { code: string; quantity: number }[] = [],
    rates: { code: string }[] = []
  ) => {
    const lower = (s: string) => s?.toLowerCase?.() ?? ''
    const findCode = (needle: string) =>
      rates.find((r) => lower(r.code).includes(needle))?.code

    const pionCode = findCode('pion')
    const listwaCode = findCode('listw')

    const pion =
      (pionCode
        ? entries.find((e) => e.code === pionCode)?.quantity
        : entries.find((e) => lower(e.code).includes('pion'))?.quantity) ?? 0

    const listwa =
      (listwaCode
        ? entries.find((e) => e.code === listwaCode)?.quantity
        : entries.find((e) => lower(e.code).includes('listw'))?.quantity) ?? 0

    return { pion, listwa }
  }

  const prevAssignedIds = useMemo<string[]>(
    () =>
      (oExtra.assignedEquipment ?? [])
        .map((e) => e.warehouse?.id ?? e.warehouseId ?? undefined)
        .filter((x): x is string => typeof x === 'string'),
    [oExtra.assignedEquipment]
  )

  const collectedFromAssigned = useMemo(
    () =>
      (oExtra.assignedEquipment ?? []).flatMap((e) => {
        const w = e.warehouse
        if (
          w?.status === 'COLLECTED_FROM_CLIENT' &&
          w?.name &&
          w?.serialNumber
        ) {
          return [
            {
              id: genUUID(),
              name: w.name,
              category: w.category ?? DeviceCategory.OTHER,
              serialNumber: w.serialNumber.toUpperCase(),
            },
          ]
        }
        return []
      }),
    [oExtra.assignedEquipment]
  )

  const stockOptions = useMemo<IssuedItemDevice[]>(() => {
    const fromTech = mapTechToIssued(techDevices as TechDeviceInput[])
    const fromAssigned = mapAssignedToIssued(oExtra.assignedEquipment)
    const map = new Map<string, IssuedItemDevice>()
    for (const d of [...fromTech, ...fromAssigned]) map.set(d.id, d)
    return Array.from(map.values())
  }, [techDevices, oExtra.assignedEquipment])

  /* ---------------- amend prefill (from getOrderById) ---------------- */
  useEffect(() => {
    if (mode !== 'amend') return
    setStatus(order.status ?? 'COMPLETED')
    setNotes(order.notes ?? '')
    setFailureReason(oExtra.failureReason ?? '')

    const entries = (oExtra.settlementEntries ?? []).map(
      ({ code, quantity }) => ({ code, quantity })
    )
    const { pion, listwa } = extractInstallFromSettlement(entries, workCodeDefs)

    setInstall({ pion, listwa })

    setActivatedServices(normalizeServices(oExtra.services))
    setMaterials(normalizeMaterials(oExtra.usedMaterials))

    const normCollected = normalizeCollected(oExtra.collectedDevices)
    if (normCollected.length > 0) {
      setCollected(normCollected)
      setCollectEnabled(true)
    } else if (collectedFromAssigned.length > 0) {
      setCollected(collectedFromAssigned)
      setCollectEnabled(true)
    } else {
      setCollected([])
      setCollectEnabled(false)
    }

    if (orderType !== 'INSTALATION') {
      const hadIssued = (oExtra.assignedEquipment?.length ?? 0) > 0
      setUsedEnabled(hadIssued)
      setSelectedDevices([])
    } else {
      setUsedEnabled(false)
      setSelectedDevices([])
    }
  }, [
    mode,
    order,
    orderType,
    oExtra.failureReason,
    oExtra.services,
    oExtra.usedMaterials,
    oExtra.collectedDevices,
    oExtra.assignedEquipment,
    collectedFromAssigned,
    oExtra.settlementEntries,
    workCodeDefs,
  ])

  /* ---------------- validation + submit ---------------- */
  const validate = () => {
    if (status === OrderStatus.NOT_COMPLETED) {
      if (!failureReason) {
        toast.error('Wybierz powód niewykonania.')
        return false
      }
      return true
    }

    if (orderType === OrderType.INSTALATION && activatedServices.length === 0) {
      toast.error('Dodaj przynajmniej jedną usługę.')
      return false
    }

    if (orderType !== OrderType.INSTALATION && usedEnabled) {
      const hasNew = selectedDevices.length > 0
      const hadPrev = (oExtra.assignedEquipment?.length ?? 0) > 0
      if (!hasNew && !hadPrev) {
        toast.error(
          'Dodaj przynajmniej jedno urządzenie z magazynu albo wyłącz „Wydanie urządzeń”.'
        )
        return false
      }
    }

    if (collectEnabled && collected.length === 0) {
      toast.error(
        'Dodaj urządzenia odebrane od klienta lub wyłącz przełącznik.'
      )
      return false
    }

    const tmobile =
      order.operator
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
        .includes('TMOBILE') || order.operator === 'TMPL'

    for (const s of activatedServices) {
      if (s.type === 'DTV') {
        if (!s.deviceId && !s.serialNumber) {
          toast.error('DTV: dodaj dekoder (wymagany nr seryjny).')
          return false
        }
        const isTwoWay = s.deviceType === 'DECODER_2_WAY'
        if (isTwoWay) {
          if (s.usDbmDown === undefined || s.usDbmUp === undefined) {
            toast.error(
              'DTV: wprowadź DS i US (przycisk „Dodaj” nie jest wymagany).'
            )
            return false
          }
        }
      }

      if (s.type === 'NET') {
        if (!s.deviceId && !s.serialNumber) {
          toast.error('NET: dodaj Modem/ONT (wymagany nr seryjny).')
          return false
        }
        if (tmobile && !s.deviceId2 && !s.serialNumber2) {
          toast.error('NET (T-Mobile): dodaj Router.')
          return false
        }
        if (
          s.usDbmDown === undefined ||
          s.usDbmUp === undefined ||
          !s.speedTest
        ) {
          toast.error(
            'NET: wprowadź DS/US oraz Speedtest (przycisk „Dodaj” nie jest wymagany).'
          )
          return false
        }
      }
    }

    return true
  }

  /* ---------------- mutations ---------------- */
  const techAmendMutation = trpc.order.amendCompletion.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane.')
      onCloseAction()
    },
    onError: (err) =>
      toast.error('Błąd zapisu zlecenia.', { description: getErrMessage(err) }),
  })

  const adminAmendMutation = trpc.order.adminEditCompletion.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane.')
      onCloseAction()
    },
    onError: (err) =>
      toast.error('Błąd zapisu zlecenia.', { description: getErrMessage(err) }),
  })

  const completeMutation = trpc.order.completeOrder.useMutation({
    onSuccess: (data) => {
      if (data?.warnings?.length) data.warnings.forEach((w) => toast.warning(w))
      toast.success('Zlecenie zostało zakończone.')
      onCloseAction()
    },
    onError: (err) =>
      toast.error('Błąd zapisu zlecenia.', { description: getErrMessage(err) }),
  })

  const mutation =
    mode === 'amend'
      ? isAdmin || isCoordinator
        ? adminAmendMutation
        : techAmendMutation
      : completeMutation

  const submit = () => {
    if (!validate()) return

    let equipmentIds: string[] = []

    if (status === 'COMPLETED') {
      if (orderType === 'INSTALATION') {
        equipmentIds = activatedServices
          .flatMap((s) => [s.deviceId, s.deviceId2])
          .filter((x): x is string => typeof x === 'string')
      } else if (usedEnabled) {
        equipmentIds =
          mode === 'amend'
            ? selectedDevices.length > 0
              ? selectedDevices.map((d) => d.id)
              : prevAssignedIds
            : selectedDevices.map((d) => d.id)
      }
    }

    const workCodes =
      status === 'COMPLETED' && orderType === 'INSTALATION'
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
      services: activatedServices,
    })
  }

  /* ---------------- render ---------------- */
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCloseAction()}>
      <DialogContent className="max-w-lg md:max-w-2xl w-[95vw] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            {mode === 'amend' ? 'Edytuj / uzupełnij odpis' : 'Zakończ zlecenie'}
          </DialogTitle>
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
              {orderType === 'INSTALATION' && (
                <>
                  <h4 className="font-semibold">Uruchomione usługi</h4>
                  <ServicesSection
                    operator={order.operator}
                    devices={stockOptions}
                    value={activatedServices}
                    onChangeAction={setActivatedServices}
                    mode={mode}
                  />
                  <h4 className="font-semibold">Instalacja</h4>
                  <InstallationSection
                    activatedServices={activatedServices}
                    value={install}
                    onChangeAction={setInstall}
                  />
                </>
              )}

              {orderType !== 'INSTALATION' && (
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="used-switch"
                      checked={usedEnabled}
                      onCheckedChange={(on) => {
                        setUsedEnabled(on)
                        if (!on) setSelectedDevices([])
                      }}
                    />
                    <label htmlFor="used-switch" className="font-semibold">
                      Wydanie urządzeń
                    </label>
                  </div>

                  {usedEnabled && (
                    <>
                      <h4 className="font-semibold">Urządzenia wydane</h4>
                      <SerialScanInput
                        devices={stockOptions}
                        onAddDevice={(dev: unknown) => {
                          if (isIssuedItemDevice(dev)) handleAddStockDevice(dev)
                        }}
                        variant="block"
                      />
                      {selectedDevices.map((d) => (
                        <DeviceSummaryRow
                          key={d.id}
                          device={d}
                          onRemove={handleRemoveStockDevice}
                        />
                      ))}
                      {selectedDevices.length === 0 && (
                        <div className="text-xs text-muted-foreground">
                          Brak dodanych urządzeń.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="collect-switch"
                    checked={collectEnabled}
                    onCheckedChange={setCollectEnabled}
                  />
                  <label htmlFor="collect-switch" className="font-semibold">
                    Odbiór urządzeń
                  </label>
                </div>

                {collectEnabled && (
                  <>
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
                        className="flex-1 [text-transform:uppercase]"
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
                    {collected.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        Brak odebranych urządzeń.
                      </div>
                    )}
                  </>
                )}
              </div>

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
          <FailureReasonSelect
            value={failureReason}
            onChange={setFailureReason}
          />
        )}

        <Textarea
          placeholder="Uwagi (opcjonalnie)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isLoading}>
            {mutation.isLoading
              ? 'Zapisywanie...'
              : mode === 'amend'
              ? 'Zapisz zmiany'
              : 'Zapisz i zakończ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOrderModal
