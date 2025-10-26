'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Progress } from '@/app/components/ui/progress'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import {
  DeviceCategory,
  MaterialDefinition,
  MaterialUnit,
  OrderStatus,
  OrderType,
  Prisma,
  RateDefinition,
} from '@prisma/client'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ActivatedService, IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { MdClose } from 'react-icons/md'
import StepCollectedAndNotes from './steps/StepCollectedAndNotes'
import StepInstallationAndMaterials from './steps/StepInstallationAndMaterials'
import StepServices from './steps/StepServices'
import StepStatus from './steps/StepStatus'
import StepSummary from './steps/StepSummary'

const STEPS_INSTALLATION = [
  'Status',
  'Usługi',
  'Instalacja i materiały',
  'Odbiór i uwagi',
  'Podsumowanie',
]

const STEPS_SERVICE = ['Status', 'Odbiór i uwagi', 'Podsumowanie']

/** Prisma type including all required relations for full order details */
type FullOrder = Prisma.OrderGetPayload<{
  include: {
    assignedTo: { select: { id: true; name: true } }
    history: {
      include: { changedBy: { select: { id: true; name: true } } }
    }
    settlementEntries: true
    usedMaterials: { include: { material: true } }
    assignedEquipment: { include: { warehouse: true } }
    services: true
  }
}>

interface Props {
  open: boolean
  order: FullOrder
  orderType: OrderType
  onCloseAction: () => void
  materialDefs: MaterialDefinition[]
  techMaterials: {
    id: string
    name: string
    materialDefinitionId: string
    quantity: number
  }[]
  devices?: IssuedItemDevice[]
  mode?: 'complete' | 'amend' | 'adminEdit'
  workCodeDefs: RateDefinition[] | undefined
}

/**
 * Multi-step order completion and editing wizard.
 * Handles technician and admin flows.
 */
const CompleteOrderWizard = ({
  open,
  order,
  orderType,
  onCloseAction,
  materialDefs,
  techMaterials,
  devices = [],
  mode = 'complete',
  workCodeDefs,
}: Props) => {
  /** Step state */
  const [step, setStep] = useState(0)
  /** Core form states */
  const [status, setStatus] = useState<OrderStatus>('COMPLETED')
  const [services, setServices] = useState<ActivatedService[]>([])
  const [install, setInstall] = useState({ pion: 0, listwa: 0 })
  const [materials, setMaterials] = useState<
    { id: string; quantity: number }[]
  >([])
  const [collected, setCollected] = useState<
    {
      id: string
      name: string
      category: DeviceCategory
      serialNumber: string
    }[]
  >([])
  const [notes, setNotes] = useState('')
  const [failureReason, setFailureReason] = useState<string>('')
  const [issued, setIssued] = useState<IssuedItemDevice[]>([])

  const { isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()

  const STEPS =
    order.type === 'INSTALATION' ? STEPS_INSTALLATION : STEPS_SERVICE

  /**
   * Prefill data for "amend" or "adminEdit" mode.
   * Includes installation details, used materials and collected devices.
   */
  useEffect(() => {
    if (mode === 'complete') return

    const normalizedServices: ActivatedService[] =
      order.services?.map((s) => ({
        id: s.id,
        type: s.type,
        deviceId: s.deviceId ?? undefined,
        serialNumber: s.serialNumber ?? undefined,
        deviceId2: s.deviceId2 ?? undefined,
        serialNumber2: s.serialNumber2 ?? undefined,
        usDbmDown: s.usDbmDown ?? undefined,
        usDbmUp: s.usDbmUp ?? undefined,
        speedTest: s.speedTest ?? undefined,
        notes: s.notes ?? undefined,
        deviceType: s.deviceType ?? undefined,
      })) ?? []

    const normalizedMaterials =
      order.usedMaterials?.map((m) => ({
        id: m.material?.id ?? '',
        quantity: m.quantity ?? 0,
      })) ?? []

    const collectedFromAssigned =
      order.assignedEquipment
        ?.filter(
          (e) =>
            e.warehouse?.status === 'COLLECTED_FROM_CLIENT' &&
            e.warehouse?.serialNumber &&
            e.warehouse?.name
        )
        .map((e) => ({
          id: e.warehouse!.id,
          name: e.warehouse!.name,
          category: e.warehouse!.category ?? DeviceCategory.OTHER,
          serialNumber: e.warehouse!.serialNumber ?? '',
        })) ?? []

    const findQty = (keyword: string): number =>
      order.settlementEntries?.find((e) =>
        e.code.toLowerCase().includes(keyword.toLowerCase())
      )?.quantity ?? 0

    setStatus(order.status ?? 'COMPLETED')
    setNotes(order.notes ?? '')
    setServices(normalizedServices)
    setMaterials(normalizedMaterials)
    setCollected(collectedFromAssigned)
    setInstall({ pion: findQty('pion'), listwa: findQty('listw') })
  }, [mode, order])

  /** Technician stock typing */
  const techMaterialsTyped: IssuedItemMaterial[] = techMaterials.map((m) => ({
    ...m,
    type: 'MATERIAL',
  }))
  const materialDefsTyped = materialDefs.map((m) => ({
    ...m,
    unit: m.unit as MaterialUnit,
  }))

  /** Mutations */
  const completeMutation = trpc.order.completeOrder.useMutation()
  const amendMutation = trpc.order.amendCompletion.useMutation()
  const adminEditMutation = trpc.order.adminEditCompletion.useMutation()

  const resolveMutation = () => {
    if (mode === 'adminEdit') return adminEditMutation
    if (mode === 'amend')
      return isAdmin || isCoordinator ? adminEditMutation : amendMutation
    return completeMutation
  }

  /**
   * Handles final submission.
   * Selects appropriate mutation based on role and mode.
   */
  const handleSubmit = async (payload: {
    status: OrderStatus
    notes?: string | null
    failureReason?: string
    workCodes?: { code: string; quantity: number }[]
    equipmentIds: string[]
    usedMaterials: { id: string; quantity: number }[]
    collectedDevices: {
      name: string
      category: DeviceCategory
      serialNumber?: string
    }[]
    issuedDevices?: string[]
    services: ActivatedService[]
  }) => {
    try {
      const mutation = resolveMutation()
      await mutation.mutateAsync({ orderId: order.id, ...payload })

      toast.success(
        mode === 'complete'
          ? 'Zlecenie zostało zakończone.'
          : 'Zlecenie zostało zaktualizowane.'
      )

      await utils.order.getTechnicianRealizedOrders.invalidate()
      await utils.order.getOrderById.invalidate({ id: order.id })
      onCloseAction()
    } catch {
      toast.error('Błąd podczas zapisu zlecenia.')
    }
  }

  /** Step navigation helpers */
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  /** Handles back navigation inside the wizard or closes dialog on first step */
  const back = () => {
    // If it's the first step, close the dialog
    if (step === 0) {
      onCloseAction()
      return
    }

    // If order was NOT_COMPLETED, always go back to status step
    if (status === 'NOT_COMPLETED') {
      setStep(0)
      return
    }

    // Normal flow – go back one step
    setStep((s) => Math.max(s - 1, 0))
  }

  /** Render */
  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen md:h-[90vh] md:w-full md:max-w-lg flex flex-col [&>button.absolute.right-4.top-4]:hidden">
        <DialogHeader className="border-bflex flex-row items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
          <Button variant="ghost" onClick={back} size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <DialogTitle className="text-center flex-1">
            <div className="flex flex-col items-center">
              {/* Order number */}
              <span className="text-base font-semibold">
                {order.orderNumber}
              </span>

              {/* Address (smaller, muted color) */}
              <span className="text-sm text-muted-foreground text-center leading-tight">
                {`${order.city} ${order.street}` || 'Brak adresu'}
              </span>
            </div>
          </DialogTitle>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseAction}
            aria-label="Close"
          >
            <MdClose className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <Progress
          value={((step + 1) / STEPS.length) * 100}
          className="mb-2 h-2 rounded-full md:mx-auto"
        />

        <div className="flex-1 overflow-y-auto">
          {step === 0 && (
            <StepStatus
              status={status}
              setStatus={setStatus}
              onNext={(data) => {
                setStatus(data.status)
                setNotes(data.notes || '')
                setFailureReason(data.failureReason ?? '')
                if (data.finishImmediately) setStep(STEPS.length - 1)
                else next()
              }}
              initialFailureReason={failureReason}
              initialNotes={notes}
            />
          )}

          {/* Installation flow */}
          {orderType === 'INSTALATION' && (
            <>
              {step === 1 && (
                <StepServices
                  services={services}
                  setServices={setServices}
                  onNext={next}
                  onBack={back}
                  operator={order.operator}
                  devices={devices}
                />
              )}

              {step === 2 && (
                <StepInstallationAndMaterials
                  activatedServices={services}
                  installValue={install}
                  onInstallChange={setInstall}
                  materials={materials}
                  setMaterials={setMaterials}
                  materialDefs={materialDefsTyped}
                  techMaterials={techMaterialsTyped}
                  onNext={next}
                  onBack={back}
                />
              )}

              {step === 3 && (
                <StepCollectedAndNotes
                  orderType={orderType}
                  devices={devices}
                  collected={collected}
                  setCollected={setCollected}
                  issued={issued}
                  setIssued={setIssued}
                  notes={notes}
                  setNotes={setNotes}
                  onNext={next}
                  onBack={back}
                />
              )}

              {step === 4 && (
                <StepSummary
                  orderType={orderType}
                  status={status}
                  services={services}
                  install={install}
                  materials={materials}
                  collected={collected}
                  notes={notes}
                  onBack={back}
                  onSubmit={handleSubmit}
                  materialDefs={materialDefsTyped}
                  workCodeDefs={workCodeDefs ?? []}
                  failureReason={failureReason}
                />
              )}
            </>
          )}

          {/* Service / Outage flow */}
          {orderType !== 'INSTALATION' && (
            <>
              {step === 1 && (
                <StepCollectedAndNotes
                  orderType={orderType}
                  devices={devices}
                  collected={collected}
                  setCollected={setCollected}
                  issued={issued}
                  setIssued={setIssued}
                  notes={notes}
                  setNotes={setNotes}
                  onNext={({ collected, issued, notes }) => {
                    setCollected(collected)
                    setIssued(issued)
                    setNotes(notes)
                    next()
                  }}
                  onBack={back}
                />
              )}

              {step === 2 && (
                <StepSummary
                  orderType={orderType}
                  status={status}
                  services={[]}
                  install={{ pion: 0, listwa: 0 }}
                  materials={materials}
                  collected={collected}
                  notes={notes}
                  onBack={back}
                  onSubmit={handleSubmit}
                  materialDefs={materialDefsTyped}
                  workCodeDefs={workCodeDefs ?? []}
                  failureReason={failureReason}
                  issued={issued}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOrderWizard
