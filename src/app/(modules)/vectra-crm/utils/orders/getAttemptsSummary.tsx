import { statusMap } from '@/lib/constants'
import { OrderWithAttempts } from '@/types'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { ReactNode } from 'react'

/**
 * Generates clean timeline entries for technician attempts of a given order.
 * Each attempt = one event with date, status, technician, failure reason, notes.
 */
export function getAttemptsSummary(order: OrderWithAttempts) {
  if (!order.attempts?.length) return []

  const events: {
    id: string
    date: string
    title: string
    description?: ReactNode
    color: 'success' | 'danger' | 'warning'
    type: 'attempt'
  }[] = order.attempts.map((a) => ({
    id: `attempt-${a.id}`,
    date: a.date ? formatDateTime(a.date) : '—',
    title: statusMap[a.status] ?? a.status,
    color:
      a.status === 'COMPLETED'
        ? 'success'
        : a.status === 'NOT_COMPLETED'
        ? 'danger'
        : 'warning',
    type: 'attempt',
    description: (
      <>
        {a.assignedTo?.name && <p>Technik: {a.assignedTo.name}</p>}
        {a.failureReason && (
          <p className="text-destructive font-medium">
            Powód: {a.failureReason}
          </p>
        )}
        {a.notes && (
          <p className="italic text-muted-foreground">Uwagi: {a.notes}</p>
        )}
      </>
    ),
  }))

  // sort by date descending (newest first)
  return events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}
