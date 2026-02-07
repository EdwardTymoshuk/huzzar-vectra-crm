'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Progress } from '@/app/components/ui/progress'
import { RouterOutputs } from '@/types'
import { OplIssuedItemDevice } from '@/types/opl-crm'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import {
  OplDeviceCategory,
  OplMaterialDefinition,
  OplOrderStatus,
  OplOrderType,
  OplRateDefinition,
} from '@prisma/client'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import OplStepStatus from './steps/OplStepStatus'
import OplStepWorkCodes from './steps/OplStepWorkCodes'

const STEPS_INSTALLATION = [
  'Status',
  'Kody pracy',
  'Instalacja i materiały',
  'Odbiór i uwagi',
  'Podsumowanie',
]

const STEPS_SERVICE = ['Status', 'Odbiór i uwagi', 'Materiały', 'Podsumowanie']

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
  /** Wizard step index */
  const [step, setStep] = useState(0)

  /** Core order state */
  const [status, setStatus] = useState<OplOrderStatus>('COMPLETED')
  const [install, setInstall] = useState({ pion: 0, listwa: 0 })
  const [materials, setMaterials] = useState<
    { id: string; quantity: number }[]
  >([])
  const [collected, setCollected] = useState<
    {
      id: string
      name: string
      category: OplDeviceCategory
      serialNumber: string
    }[]
  >([])
  const [issued, setIssued] = useState<OplIssuedItemDevice[]>([])
  const [notes, setNotes] = useState('')
  const [failureReason, setFailureReason] = useState('')

  const { isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()

  const STEPS =
    order.type === 'INSTALLATION' ? STEPS_INSTALLATION : STEPS_SERVICE

  /** Mutations */
  const completeMutation = trpc.opl.order.completeOrder.useMutation()
  const amendMutation = trpc.opl.order.amendCompletion.useMutation()
  const adminEditMutation = trpc.opl.order.adminEditCompletion.useMutation()

  /**
   * Resolves correct mutation based on mode and role.
   */
  const resolveMutation = () => {
    if (mode === 'adminEdit') return adminEditMutation
    if (mode === 'amend')
      return isAdmin || isCoordinator ? adminEditMutation : amendMutation
    return completeMutation
  }

  /**
   * Handles final order submission.
   * Mapping of workCodesDraft -> backend payload
   * will be done here later.
   */
  const handleSubmit = async () => {
    try {
      const mutation = resolveMutation()

      await mutation.mutateAsync({
        orderId: order.id,
        status,
        notes,
        failureReason,
        // TODO: map workCodesDraft -> workCodes[]
      })

      toast.success(
        mode === 'complete'
          ? 'Zlecenie zostało zakończone.'
          : 'Zlecenie zostało zaktualizowane.'
      )

      await Promise.all([
        utils.opl.order.getTechnicianRealizedOrders.invalidate(),
        utils.opl.order.getOrderById.invalidate({ id: order.id }),
        utils.opl.order.getAssignedOrders.invalidate(),
        utils.opl.order.getUnassignedOrders.invalidate(),
      ])

      onCloseAction()
    } catch {
      toast.error('Błąd podczas zapisu zlecenia.')
    }
  }

  /** Navigation */
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))

  const back = () => {
    if (step === 0) {
      onCloseAction()
      return
    }

    if (status === 'NOT_COMPLETED') {
      setStep(0)
      return
    }

    setStep((s) => Math.max(s - 1, 0))
  }

  /** Render */
  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen md:h-[90vh] md:max-w-lg flex flex-col overflow-x-hidden [&>button.absolute.right-4.top-4]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
          <Button variant="ghost" onClick={back} size="icon">
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
              key={order.id}
              status={status}
              setStatus={setStatus}
              initialNotes={notes}
              initialFailureReason={failureReason}
              onNext={(data) => {
                setStatus(data.status)
                setNotes(data.notes ?? '')
                setFailureReason(data.failureReason ?? '')
                data.finishImmediately ? setStep(STEPS.length - 1) : next()
              }}
            />
          )}

          {orderType === 'INSTALLATION' && step === 1 && (
            <OplStepWorkCodes
              standard={order.standard ?? undefined}
              onBack={back}
              onNext={next}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOplOrderWizard
