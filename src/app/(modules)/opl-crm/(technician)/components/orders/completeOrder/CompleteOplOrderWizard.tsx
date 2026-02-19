'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import {
  buildOrderNotesWithMeasurements,
  parseMeasurementsFromNotes,
} from '@/app/(modules)/opl-crm/utils/order/notesFormatting'
import { buildOrderedWorkCodes } from '@/app/(modules)/opl-crm/utils/order/workCodesPresentation'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Progress } from '@/app/components/ui/progress'
import { mapEquipmentRequirementsToSuggested } from '@/server/modules/opl-crm/helpers/mappers/mapEquipmentRequirementsToSuggested'
import { RouterOutputs } from '@/types'
import { OplIssuedItemDevice } from '@/types/opl-crm'
import {
  OplMaterialDefinition,
  OplOrderType,
  OplRateDefinition,
} from '@prisma/client'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory } from '@prisma/client'
import { ArrowLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef } from 'react'
import { MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import OplStepEquipment from './steps/OplStepEquipment'
import OplStepMaterials from './steps/OplStepMaterials'
import OplStepNotes from './steps/OplStepNotes'
import OplStepStatus from './steps/OplStepStatus'
import OplStepSummary from './steps/OplStepSummary'
import OplStepServiceCodes from './steps/OplStepServiceCodes'
import OplStepWorkCodes from './steps/OplStepWorkCodes'

const STEPS_INSTALLATION = [
  'Status',
  'Kody pracy i PKI',
  'Urządzenia zainstalowane i odebrane',
  'Materiały',
  'Uwagi',
  'Podsumowanie',
]

const STEPS_SERVICE = [
  'Status',
  'Kody pracy i PKU',
  'Urządzenia zainstalowane i odebrane',
  'Materiały',
  'Uwagi',
  'Podsumowanie',
]

type FullOrder = RouterOutputs['opl']['order']['getOrderById']

interface Props {
  open: boolean
  order: FullOrder
  orderType: OplOrderType
  onCloseAction: () => void
  materialDefs: OplMaterialDefinition[]
  techMaterials: {
    id: string
    name: string
    materialDefinitionId: string
    quantity: number
    sourceLabel?: string
  }[]
  devices?: OplIssuedItemDevice[]
  mode?: 'complete' | 'amend' | 'adminEdit'
  workCodeDefs: OplRateDefinition[] | undefined
}

/**
 * Multi-step OPL order completion wizard.
 * UI-first flow, backend mapping happens only on submit.
 */
const CompleteOplOrderWizard = ({
  open,
  order,
  orderType,
  onCloseAction,
  materialDefs,
  techMaterials,
  devices = [],
  mode = 'complete',
}: Props) => {
  const {
    state,
    hydrateState,
    setStep,
    next,
    back,
    setStatus,
    setFailureReason,
    setNotes,
    setMeasurementOpp,
    setMeasurementGo,
    setSoloCompletion,
    setSoloTechnicianId,
  } = useCompleteOplOrder()
  const { data: session } = useSession()
  const { isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()
  const completeMutation = trpc.opl.order.completeOrder.useMutation()
  const amendMutation = trpc.opl.order.amendCompletion.useMutation()
  const adminEditMutation = trpc.opl.order.adminEditCompletion.useMutation()
  const isSubmitting =
    completeMutation.isPending ||
    amendMutation.isPending ||
    adminEditMutation.isPending

  const { step, status, failureReason, notes, soloCompletion, soloTechnicianId } =
    state
  const prefilledRef = useRef(false)

  const STEPS =
    order.type === 'INSTALLATION' ? STEPS_INSTALLATION : STEPS_SERVICE

  const normalizedDevices = devices.filter(
    (d): d is OplIssuedItemDevice & { deviceDefinitionId: string } =>
      typeof d.deviceDefinitionId === 'string'
  )

  const serialToDeviceId = useMemo(
    () =>
      new Map(
        normalizedDevices
          .filter((d) => d.serialNumber)
          .map((d) => [d.serialNumber.trim().toUpperCase(), d.id])
      ),
    [normalizedDevices]
  )

  useEffect(() => {
    if (!open) {
      return
    }
    if (mode === 'complete') return
    if (prefilledRef.current) return

    const normalizeIncomingCode = (code: string): string => {
      if (code === '1P') return 'I_1P'
      if (code === '2P') return 'I_2P'
      if (code === '3P') return 'I_3P'
      return code
    }
    const parsedNotes = parseMeasurementsFromNotes(order.notes)

    const issuedItems = (order.assignedEquipment ?? [])
      .filter((item) =>
        item.warehouse.history?.some(
          (h) =>
            h.assignedOrderId === order.id &&
            (h.action === 'ASSIGNED_TO_ORDER' || h.action === 'ISSUED_TO_CLIENT')
        )
      )
      .map((item, idx) => ({
        clientId: `issued-${item.warehouse.id}-${idx}`,
        deviceDefinitionId: item.warehouse.deviceDefinitionId ?? null,
        warehouseId: item.warehouse.id,
        name: item.warehouse.name ?? '',
        category: (item.warehouse.category ?? 'OTHER') as OplDeviceCategory,
        serial: item.warehouse.serialNumber ?? '',
      }))

    const collectedItems = (order.assignedEquipment ?? [])
      .filter((item) =>
        item.warehouse.history?.some(
          (h) =>
            h.assignedOrderId === order.id && h.action === 'COLLECTED_FROM_CLIENT'
        )
      )
      .map((item, idx) => ({
        clientId: `collected-${item.warehouse.id}-${idx}`,
        deviceDefinitionId: null,
        warehouseId: item.warehouse.id,
        name: item.warehouse.name ?? '',
        category: (item.warehouse.category ?? 'OTHER') as OplDeviceCategory,
        serial: item.warehouse.serialNumber ?? '',
      }))

    hydrateState({
      status: order.status,
      failureReason: order.failureReason ?? '',
      notes: parsedNotes.plainNotes,
      measurementOpp: parsedNotes.measurements.opp,
      measurementGo: parsedNotes.measurements.go,
      soloCompletion: Boolean(
        order.history?.find((h) =>
          h.statusAfter === 'COMPLETED' || h.statusAfter === 'NOT_COMPLETED'
        )?.notes?.includes('[SOLO]')
      ),
      soloTechnicianId:
        order.history
          ?.find((h) => h.notes?.includes('[SOLO:'))
          ?.notes?.match(/\[SOLO:([^\]]+)\]/)?.[1] ?? '',
      workCodes: (order.settlementEntries ?? []).map((entry) => ({
        code: normalizeIncomingCode(entry.code),
        quantity: entry.quantity,
      })),
      usedMaterials: (order.usedMaterials ?? []).map((m) => ({
        id: m.materialId,
        quantity: m.quantity,
      })),
      equipment: {
        issued: {
          enabled: issuedItems.length > 0,
          skip: false,
          items: issuedItems,
        },
        collected: {
          enabled: collectedItems.length > 0,
          skip: false,
          items: collectedItems,
        },
      },
    })

    prefilledRef.current = true
  }, [hydrateState, mode, open, order])

  const resolveMutation = () => {
    if (mode === 'adminEdit') return adminEditMutation
    if (mode === 'amend')
      return isAdmin || isCoordinator ? adminEditMutation : amendMutation
    return completeMutation
  }

  const handleSubmit = async (
    override?: Partial<{
      status: typeof state.status
      notes: string
      failureReason: string
    }>
  ) => {
    const finalStatus = override?.status ?? state.status
    const finalNotes = override?.notes ?? state.notes
    const finalFailureReason = override?.failureReason ?? state.failureReason

    if (!finalStatus) {
      toast.error('Wybierz status zlecenia.')
      return
    }

    if (
      finalStatus === 'COMPLETED' &&
      soloCompletion &&
      (order.assignments?.length ?? 0) > 1 &&
      !soloTechnicianId
    ) {
      toast.error('Wybierz technika realizującego solo.')
      return
    }

    const workCodes =
      orderType === 'INSTALLATION'
        ? buildOrderedWorkCodes(state.workCodes, state.digInput)
        : state.workCodes
    const equipmentIds = state.equipment.issued.items
      .map((item) => {
        if (item.warehouseId) return item.warehouseId
        return serialToDeviceId.get(item.serial.trim().toUpperCase()) ?? null
      })
      .filter((id): id is string => Boolean(id))

    const unresolvedSerials = state.equipment.issued.items
      .map((item) => item.serial.trim().toUpperCase())
      .filter(
        (serial, idx) =>
          serial.length > 0 &&
          !state.equipment.issued.items[idx]?.warehouseId &&
          !serialToDeviceId.has(serial)
      )

    if (finalStatus === 'COMPLETED' && unresolvedSerials.length > 0) {
      toast.error('Niektóre urządzenia nie istnieją na stanie technika.')
      return
    }

    try {
      await resolveMutation().mutateAsync({
        orderId: order.id,
        status: finalStatus,
        notes: buildOrderNotesWithMeasurements(finalNotes, {
          opp: state.measurementOpp,
          go: state.measurementGo,
        }) || null,
        failureReason: finalFailureReason || null,
        soloCompletion,
        soloTechnicianId:
          soloCompletion && (order.assignments?.length ?? 0) > 1
            ? soloTechnicianId || session?.user?.id
            : undefined,
        workCodes: finalStatus === 'COMPLETED' ? workCodes : [],
        equipmentIds: finalStatus === 'COMPLETED' ? equipmentIds : [],
        usedMaterials: finalStatus === 'COMPLETED' ? state.usedMaterials : [],
        collectedDevices:
          finalStatus === 'COMPLETED' && state.equipment.collected.enabled
            ? state.equipment.collected.items
                .filter((item) => item.name.trim().length > 0)
                .map((item) => ({
                  name: item.name.trim(),
                  category: item.category,
                  serialNumber: item.serial.trim().toUpperCase() || undefined,
                }))
            : [],
      })

      toast.success(
        mode === 'complete'
          ? 'Zlecenie zostało zakończone.'
          : 'Zlecenie zostało zaktualizowane.'
      )

      await Promise.all([
        utils.opl.order.getOrderById.invalidate({ id: order.id }),
        utils.opl.order.getTechnicianActiveOrders.invalidate(),
        utils.opl.order.getTechnicianRealizedOrders.invalidate(),
        utils.opl.order.getAssignedOrders.invalidate(),
        utils.opl.order.getUnassignedOrders.invalidate(),
      ])

      onCloseAction()
    } catch {
      toast.error('Błąd podczas zapisu zlecenia.')
    }
  }

  const handleBack = () => {
    if (step === 0) {
      onCloseAction()
      return
    }

    if (status === 'NOT_COMPLETED') {
      setStep(0)
      return
    }

    back()
  }

  /** Render */
  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen md:h-[90vh] md:max-w-lg flex flex-col overflow-x-hidden [&>button.absolute.right-4.top-4]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
          <Button variant="ghost" onClick={handleBack} size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <DialogTitle className="flex-1 text-center">
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold">
                {order.orderNumber}
              </span>
              <span className="text-sm text-muted-foreground">
                {`${order.city} ${order.street}` || 'Brak adresu'}
              </span>
            </div>
          </DialogTitle>

          <Button variant="ghost" size="icon" onClick={onCloseAction}>
            <MdClose className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <Progress
          value={((step + 1) / STEPS.length) * 100}
          className="mb-2 h-2 rounded-full"
        />

        <div className="flex-1 overflow-y-auto">
          {step === 0 && (
            <OplStepStatus
              orderNumber={order.orderNumber}
              orderAddress={`${order.city} ${order.street}`.trim()}
              status={status}
              setStatus={setStatus}
              failureReason={failureReason}
              setFailureReason={setFailureReason}
              notes={notes}
              setNotes={setNotes}
              isTeamOrder={(order.assignments?.length ?? 0) > 1}
              isAdminEditMode={mode === 'adminEdit' && (isAdmin || isCoordinator)}
              teamTechnicians={order.assignments.map((a) => ({
                id: a.technician.user.id,
                name: a.technician.user.name,
              }))}
              soloCompletion={soloCompletion}
              setSoloCompletion={setSoloCompletion}
              soloTechnicianId={soloTechnicianId}
              setSoloTechnicianId={setSoloTechnicianId}
              onNext={(data) => {
                setStatus(data.status)
                setFailureReason(data.failureReason ?? '')
                setNotes(data.notes ?? '')
                if (data.status !== 'COMPLETED') {
                  setSoloCompletion(false)
                  setSoloTechnicianId('')
                }
                if (
                  data.status === 'COMPLETED' &&
                  soloCompletion &&
                  mode !== 'adminEdit'
                ) {
                  setSoloTechnicianId(session?.user?.id ?? '')
                }

                if (data.finishImmediately) {
                  void handleSubmit({
                    status: data.status,
                    notes: data.notes ?? '',
                    failureReason: data.failureReason ?? '',
                  })
                  return
                }

                next(STEPS.length)
              }}
            />
          )}

          {orderType === 'INSTALLATION' && (
            <>
              {step === 1 && (
                <OplStepWorkCodes
                  standard={order.standard ?? undefined}
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                />
              )}
              {step === 2 && (
                <OplStepEquipment
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                  suggestedIssued={mapEquipmentRequirementsToSuggested(
                    order.equipmentRequirements
                  )}
                  mode={mode}
                  technicianDevices={normalizedDevices}
                />
              )}
              {step === 3 && (
                <OplStepMaterials
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                  orderType={orderType}
                  materialDefs={materialDefs}
                  techMaterials={techMaterials}
                />
              )}
              {step === 4 && (
                <OplStepNotes
                  orderId={order.id}
                  orderType={orderType}
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                />
              )}
              {step === 5 && (
                <OplStepSummary
                  orderType={orderType}
                  materialDefs={materialDefs}
                  onBack={handleBack}
                  onFinish={() => {
                    void handleSubmit()
                  }}
                  isSubmitting={isSubmitting}
                />
              )}
            </>
          )}

          {orderType !== 'INSTALLATION' && (
            <>
              {step === 1 && (
                <OplStepServiceCodes
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                />
              )}

              {step === 2 && (
                <OplStepEquipment
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                  suggestedIssued={[]}
                  mode={mode}
                  technicianDevices={normalizedDevices}
                />
              )}

              {step === 3 && (
                <OplStepMaterials
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                  orderType={orderType}
                  materialDefs={materialDefs}
                  techMaterials={techMaterials}
                />
              )}

              {step === 4 && (
                <OplStepNotes
                  orderId={order.id}
                  orderType={orderType}
                  onBack={handleBack}
                  onNext={() => {
                    next(STEPS.length)
                  }}
                />
              )}

              {step === 5 && (
                <OplStepSummary
                  orderType={orderType}
                  materialDefs={materialDefs}
                  onBack={handleBack}
                  onFinish={() => {
                    void handleSubmit()
                  }}
                  isSubmitting={isSubmitting}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOplOrderWizard
