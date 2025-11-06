import { statusMap } from '@/lib/constants'
import { OrderWithAttempts } from '@/types'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { Role } from '@prisma/client' // lub zdefiniuj własny enum jeśli masz inne źródło
import { ReactNode } from 'react'

/**
 * Builds full timeline entries for an order, combining attempts + history edits.
 * Admins/Coordinators see full history.
 * Technicians see only their previous NOT_COMPLETED attempts.
 */
export function getFullOrderTimeline(
  order: OrderWithAttempts & {
    history?: {
      id: string
      changeDate: Date
      statusBefore?: string | null
      statusAfter?: string | null
      notes?: string | null
      changedBy?: { name: string } | null
    }[]
  },
  role: Role // 'ADMIN' | 'COORDINATOR' | 'WAREHOUSEMAN' | 'TECHNICIAN'
) {
  const events: {
    id: string
    date: string
    title: string
    description?: ReactNode
    color: 'success' | 'danger' | 'warning'
  }[] = []

  /* ----------------------------------------------------------
   * 1️⃣ Technician attempts (from Order records)
   * ---------------------------------------------------------- */
  const filteredAttempts =
    role === 'TECHNICIAN'
      ? order.attempts?.filter((a) => a.status === 'NOT_COMPLETED') ?? []
      : order.attempts ?? []

  if (filteredAttempts.length) {
    for (const a of filteredAttempts) {
      const color =
        a.status === 'COMPLETED'
          ? 'success'
          : a.status === 'NOT_COMPLETED'
          ? 'danger'
          : 'warning'

      events.push({
        id: `attempt-${a.id}`,
        date: a.date ? formatDateTime(a.date) : '—',
        title: statusMap[a.status] ?? a.status,
        color,
        description: (
          <>
            {a.assignedTo?.name && <p>Technik: {a.assignedTo.name}</p>}
            {a.failureReason && (
              <p className="italic text-muted-foreground font-medium">
                Powód: {a.failureReason}
              </p>
            )}
            {a.notes && (
              <p className="italic text-muted-foreground">Uwagi: {a.notes}</p>
            )}
          </>
        ),
      })
    }
  }

  /* ----------------------------------------------------------
   * 2️⃣ History edits (admins only)
   * ---------------------------------------------------------- */
  if (role !== 'TECHNICIAN' && order.history?.length) {
    for (const h of order.history) {
      const color = 'warning'

      const statusChange =
        h.statusBefore && h.statusAfter && h.statusBefore !== h.statusAfter
          ? `ZMIANA STATUSU: ${statusMap[h.statusBefore]} → ${
              statusMap[h.statusAfter]
            }`
          : 'EDYCJA'

      events.push({
        id: `history-${h.id}`,
        date: formatDateTime(h.changeDate),
        title: statusChange,
        color,
        description: (
          <>{h.changedBy?.name && <p>Wykonał: {h.changedBy.name}</p>}</>
        ),
      })
    }
  }

  /* ----------------------------------------------------------
   * 3️⃣ Sort chronologically (newest first)
   * ---------------------------------------------------------- */
  return events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}
