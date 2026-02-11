'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
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
import { ArrowLeft } from 'lucide-react'
import { MdClose } from 'react-icons/md'
import OplStepEquipment from './steps/OplStepEquipment'
import OplStepStatus from './steps/OplStepStatus'
import OplStepWorkCodes from './steps/OplStepWorkCodes'

const STEPS_INSTALLATION = [
  'Status',
  'Kody pracy i PKI',
  'Urządzienia zainstalowane i odebrane',
  'Materiał i uwagi',
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
  const { state, setStep, next, back, setStatus, setFailureReason, setNotes } =
    useCompleteOplOrder()

  const { step, status, failureReason, notes } = state

  const STEPS =
    order.type === 'INSTALLATION' ? STEPS_INSTALLATION : STEPS_SERVICE

  const normalizedDevices = devices.filter(
    (d): d is OplIssuedItemDevice & { deviceDefinitionId: string } =>
      typeof d.deviceDefinitionId === 'string'
  )

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
              status={status}
              setStatus={setStatus}
              failureReason={failureReason}
              setFailureReason={setFailureReason}
              notes={notes}
              setNotes={setNotes}
              onNext={(data) => {
                setStatus(data.status)
                setFailureReason(data.failureReason ?? '')
                setNotes(data.notes ?? '')

                if (data.finishImmediately) {
                  setStep(STEPS.length - 1)
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOplOrderWizard
