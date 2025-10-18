'use client'

import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { OrderStatus } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import FailureReasonSelect from '../FailureReasonSelect'

interface StepStatusProps {
  status: OrderStatus
  setStatus: (v: OrderStatus) => void
  onNext: (data: {
    status: OrderStatus
    failureReason?: string | null
    notes?: string | null
    finishImmediately?: boolean
  }) => void
}

/**
 * StepStatus – Step 1 of CompleteOrderWizard
 *
 * Provides a simple and professional interface for selecting order status.
 * - If "NOT_COMPLETED" is selected, user provides failure reason and notes,
 *   and the wizard finishes immediately (without proceeding to next steps).
 * - If "COMPLETED" is selected, proceeds to the next step.
 */
const StepStatus = ({ status, setStatus, onNext }: StepStatusProps) => {
  const [failureReason, setFailureReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  /** Handle status selection */
  const handleSelect = (s: OrderStatus) => {
    setStatus(s)
  }

  /** Validate and proceed based on selected status */
  const handleSubmit = () => {
    if (status === 'NOT_COMPLETED') {
      if (!failureReason.trim()) {
        toast.error('Wybierz powód niewykonania.')
        return
      }
      onNext({
        status,
        failureReason,
        notes: notes || null,
        finishImmediately: true, // Finish wizard immediately for NOT_COMPLETED
      })
    } else {
      onNext({
        status,
        notes: notes || null,
        finishImmediately: false,
      })
    }
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Main content area */}
      <div className="flex-1 px-4">
        <h3 className="text-lg font-semibold text-center mb-6">
          Wybierz status zlecenia
        </h3>

        {/* Compact status buttons */}
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

        {/* Failure reason and notes visible only if NOT_COMPLETED */}
        {status === 'NOT_COMPLETED' && (
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            <FailureReasonSelect
              value={failureReason}
              onChange={setFailureReason}
            />
            <Textarea
              placeholder="Uwagi (opcjonalnie)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-background">
        <Button
          onClick={handleSubmit}
          className="w-full h-11 text-base "
          disabled={!status}
        >
          {status === 'NOT_COMPLETED' ? 'Zakończ zlecenie' : 'Dalej'}
        </Button>
      </div>
    </div>
  )
}

export default StepStatus
