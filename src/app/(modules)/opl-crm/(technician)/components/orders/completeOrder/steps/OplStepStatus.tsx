'use client'

import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { MdKeyboardArrowRight } from 'react-icons/md'
import { toast } from 'sonner'
import OplFailureReasonSelect from '../OplFailureReasonSelect'

interface OplStepStatusProps {
  orderNumber: string
  orderAddress: string
  status: OplOrderStatus | null
  setStatus: (v: OplOrderStatus) => void
  onNext: (data: {
    status: OplOrderStatus
    failureReason?: string | null
    notes?: string | null
    finishImmediately?: boolean
  }) => void
  failureReason: string
  notes: string
  setFailureReason: (v: string) => void
  setNotes: (v: string) => void
}

/**
 * OplStepStatus – Step 1 of CompleteOrderWizard
 * ---------------------------------------------------------
 * Provides a clear interface for selecting order status.
 * - If COMPLETED → proceeds to next step.
 * - If NOT_COMPLETED → requires failure reason and notes,
 *   then immediately completes the wizard (skipping further steps).
 */
const OplStepStatus = ({
  orderNumber,
  orderAddress,
  status,
  setStatus,
  failureReason,
  setFailureReason,
  notes,
  setNotes,
  onNext,
}: OplStepStatusProps) => {
  const sendFailureEmailMutation = trpc.opl.order.sendFailureEmail.useMutation()

  const handleSendFailureEmail = () => {
    if (!failureReason.trim()) {
      toast.error('Wybierz powód niewykonania przed wysłaniem maila.')
      return
    }

    sendFailureEmailMutation.mutate(
      {
        orderNumber,
        orderAddress,
        failureReason,
        notes,
      },
      {
        onSuccess: () => {
          toast.success('Email do COK został wysłany.')
        },
        onError: () => {
          toast.error('Nie udało się wysłać emaila do COK.')
        },
      }
    )
  }

  const handleSubmit = () => {
    if (status === 'NOT_COMPLETED') {
      if (!failureReason.trim()) {
        toast.error('Wybierz powód niewykonania.')
        return
      }

      if (!notes.trim()) {
        toast.error('Pole Uwagi jest obowiązkowe.')
        return
      }

      onNext({
        status,
        failureReason,
        notes,
        finishImmediately: true,
      })
      return
    }

    if (status === 'COMPLETED') {
      onNext({
        status,
        notes: notes || null,
        finishImmediately: false,
      })
    }
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* ============ Main content area ============ */}
      <div className="flex-1 px-4">
        <h3 className="text-lg font-semibold text-center mb-6">
          Wybierz status zlecenia
        </h3>

        {/* Status selection buttons */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <Button
            variant={status === 'COMPLETED' ? 'success' : 'outline'}
            onClick={() => setStatus('COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Wykonane
          </Button>

          <Button
            variant={status === 'NOT_COMPLETED' ? 'danger' : 'outline'}
            onClick={() => setStatus('NOT_COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Niewykonane
          </Button>
        </div>

        {/* Additional fields visible only when NOT_COMPLETED */}
        {status === 'NOT_COMPLETED' && (
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            <OplFailureReasonSelect
              value={failureReason}
              onChange={setFailureReason}
            />

            <div>
              <h3 className="mb-1">
                Uwagi: <span className="text-danger">*</span>
              </h3>
              <Textarea
                placeholder="Dodaj uwagi do zlecenia"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSendFailureEmail}
              disabled={sendFailureEmailMutation.isPending}
            >
              {sendFailureEmailMutation.isPending
                ? 'Wysyłanie...'
                : 'Wyślij email do COK'}
            </Button>
          </div>
        )}
      </div>

      {/* ============ Bottom navigation ============ */}
      <div className="sticky bottom-0 bg-background p-4">
        <Button
          onClick={handleSubmit}
          className="w-full h-11 text-base gap-1"
          disabled={!status}
        >
          Dalej
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export default OplStepStatus
