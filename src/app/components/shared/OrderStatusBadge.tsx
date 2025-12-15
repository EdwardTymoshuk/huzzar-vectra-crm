'use client'

import { Badge } from '@/app/components/ui/badge'
import { statusMap } from '@/lib/constants'
import { VectraOrderStatus } from '@prisma/client'

/**
 * OrderStatusBadge
 * ------------------------------------------------------------------
 * Displays a consistent status badge across the application.
 * Can render either:
 * - full text (e.g. "WYKONANE"), or
 * - short label (e.g. "W")
 *
 * Props:
 * - status: current order status
 * - compact: whether to show short form instead of full text
 * - className: optional extra styling
 */
interface OrderStatusBadgeProps {
  status: VectraOrderStatus
  compact?: boolean
  className?: string
}

/** Maps VectraOrderStatus to ShadCN badge variants */
const getVariant = (
  status: VectraOrderStatus
): 'success' | 'danger' | 'warning' | 'outline' => {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'NOT_COMPLETED':
      return 'danger'
    case 'ASSIGNED':
      return 'warning'
    default:
      return 'outline'
  }
}

/** Short text versions for compact mode */
const shortLabel: Record<VectraOrderStatus, string> = {
  COMPLETED: 'W', // wykonane
  NOT_COMPLETED: 'NW', // niewykonane
  ASSIGNED: 'P', // przypisane
  PENDING: 'NP', // nieprzypisane
}

/** Unified badge for displaying order status */
const OrderStatusBadge = ({
  status,
  compact = false,
  className,
}: OrderStatusBadgeProps) => {
  const variant = getVariant(status)
  const label = compact
    ? shortLabel[status] ?? '?'
    : statusMap[status] ?? status

  return (
    <Badge
      variant={variant}
      className={`min-w-11 justify-center ${className ?? ''}`}
      title={!compact ? undefined : statusMap[status]}
    >
      {label}
    </Badge>
  )
}

export default OrderStatusBadge
