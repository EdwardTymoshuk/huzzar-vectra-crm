'use client'

import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { OplOrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import OplFailureReasonSelect from '../OplFailureReasonSelect'

interface OplStepStatusProps {
  status: OplOrderStatus
  setStatus: (v: OplOrderStatus) => void
  onNext: (data: {
    status: OplOrderStatus
    failureReason?: string | null
    notes?: string | null
    finishImmediately?: boolean
  }) => void
  initialFailureReason?: string
  initialNotes?: string
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
  status,
  setStatus,
  onNext,
  initialNotes,
  initialFailureReason,
}: OplStepStatusProps) => {
  const [failureReason, setFailureReason] = useState<string>(
    initialFailureReason || ''
  )
  const [notes, setNotes] = useState<string>(initialNotes || '')

  /** Handles status selection change */
  const handleSelect = (s: OplOrderStatus) => {
    setStatus(s)
  }

  useEffect(() => {
    setFailureReason(initialFailureReason || '')
    setNotes(initialNotes || '')
  }, [initialFailureReason, initialNotes])

  /** Validates and proceeds depending on selected status */
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

    // Case: COMPLETED — proceed to next step normally
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
            onClick={() => handleSelect('COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Wykonane
          </Button>

          <Button
            variant={status === 'NOT_COMPLETED' ? 'danger' : 'outline'}
            onClick={() => handleSelect('NOT_COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Niewykonane
          </Button>
        </div>

        {/* Additional fields visible only when NOT_COMPLETED */}
        {status === 'NOT_COMPLETED' && (
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            {/* Required: failure reason selection */}
            <OplFailureReasonSelect
              value={failureReason}
              onChange={setFailureReason}
            />

            {/* Required: notes textarea */}
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
          </div>
        )}
      </div>

      {/* ============ Bottom navigation ============ */}
      <div className="sticky bottom-0 bg-background">
        <Button
          onClick={handleSubmit}
          className="w-full h-11 text-base"
          disabled={!status}
        >
          Dalej
        </Button>
      </div>
    </div>
  )
}

export default OplStepStatus
