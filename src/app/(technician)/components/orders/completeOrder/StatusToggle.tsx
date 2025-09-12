'use client'

import { Button } from '@/app/components/ui/button'
import { OrderStatus } from '@prisma/client'

type Props = {
  value: OrderStatus
  onChange: (next: OrderStatus) => void
}

/**
 * StatusToggle
 * -----------------------------------------------------------------------------
 * Small, focused toggle for switching between COMPLETED and NOT_COMPLETED.
 * Keeps the main modal slimmer and the control reusable.
 */

const StatusToggle: React.FC<Props> = ({ value, onChange }) => {
  const isCompleted = value === 'COMPLETED'
  const isNotCompleted = value === 'NOT_COMPLETED'

  return (
    <div className="flex gap-4 justify-center">
      <Button
        variant={isCompleted ? 'default' : 'outline'}
        onClick={() => onChange('COMPLETED')}
      >
        Wykonane
      </Button>
      <Button
        variant={isNotCompleted ? 'default' : 'outline'}
        onClick={() => onChange('NOT_COMPLETED')}
      >
        Niewykonane
      </Button>
    </div>
  )
}

export default StatusToggle
