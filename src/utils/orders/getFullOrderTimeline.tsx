import { statusMap } from '@/lib/constants'
import { OrderWithAttempts } from '@/types'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { OrderType, Role } from '@prisma/client'
import { ReactNode } from 'react'

/**
 * Builds a full chronological timeline for an order.
 * - Technicians: see only attempts (actual visits)
 * - Admins / Coordinators: see full history (creation, status changes, confirmation)
 *
 * Sorting precision:
 * - Uses raw Date objects to maintain true chronological order (including milliseconds)
 * - Creation/history events appear before attempts when sharing the same timestamp
 */
export function getFullOrderTimeline(
  order: OrderWithAttempts & {
    type: OrderType
    closedAt?: Date | null
    history?: {
      id: string
      changeDate: Date
      statusBefore?: string | null
      statusAfter?: string | null
      notes?: string | null
      changedBy?: { name: string } | null
    }[]
  },
  role: Role
) {
  const events: {
    id: string
    rawDate: Date
    title: string
    description?: ReactNode
    color: 'success' | 'danger' | 'warning' | 'secondary'
  }[] = []

  /* ----------------------------------------------------------
   * 1️⃣ Attempts (visible for everyone)
   * ---------------------------------------------------------- */
  if (order.attempts?.length) {
    for (const a of order.attempts) {
      const color =
        a.status === 'COMPLETED'
          ? 'success'
          : a.status === 'NOT_COMPLETED'
          ? 'danger'
          : 'warning'

      // Select most relevant timestamp
      const displayDate = a.completedAt ?? a.closedAt ?? a.createdAt ?? a.date

      events.push({
        id: `attempt-${a.id}`,
        rawDate: displayDate,
        title: `Wejście ${a.attemptNumber} — ${
          statusMap[a.status] ?? a.status
        }`,
        color,
        description: (
          <>
            {a.assignedTo?.name && <p>Technik: {a.assignedTo.name}</p>}
            {a.failureReason && (
              <p className=" text-muted-foreground text-xs font-medium">
                Powód: {a.failureReason}
              </p>
            )}
            {a.notes && (
              <p className=" text-xs text-muted-foreground">Uwagi: {a.notes}</p>
            )}
          </>
        ),
      })
    }
  }

  /* ----------------------------------------------------------
   * 2️⃣ Additional events only for admins / coordinators
   * ---------------------------------------------------------- */
  const isPrivileged = role === 'ADMIN' || role === 'COORDINATOR'

  if (isPrivileged) {
    // Admin confirmation (SERVICE / OUTAGE only)
    if (
      order.closedAt &&
      (order.type === 'SERVICE' || order.type === 'OUTAGE')
    ) {
      events.push({
        id: `closed-${order.id}`,
        rawDate: order.closedAt,
        title: 'Zlecenie zatwierdzone przez koordynatora',
        color: 'secondary',
        description: (
          <p className=" text-xs text-muted-foreground">
            Rozliczenie i ostateczna akceptacja zlecenia.
          </p>
        ),
      })
    }

    // Full order history (creation + status changes + edits)
    if (order.history?.length) {
      for (const h of order.history) {
        const note = h.notes?.toLowerCase() ?? ''
        let title = ''
        let color: 'warning' | 'secondary' = 'warning'

        // ✅ Detect creation (manual / planner / retry)
        if (
          note.includes('pierwsze wejście') ||
          note.includes('ponowne podejście') ||
          note.includes('utworzono zlecenie') ||
          note.includes('dodano zlecenie')
        ) {
          if (note.includes('planer')) {
            title = 'Dodano zlecenie w planerze'
          } else {
            title = 'Utworzono zlecenie ręcznie'
          }
          color = 'secondary'
        }
        // ✅ Real status changes
        else if (
          h.statusBefore &&
          h.statusAfter &&
          h.statusBefore !== h.statusAfter
        ) {
          title = `ZMIANA STATUSU: ${statusMap[h.statusBefore]} → ${
            statusMap[h.statusAfter]
          }`
          color = 'warning'
        } else {
          title = 'Edycja'
          color = 'warning'
        }

        events.push({
          id: `history-${h.id}`,
          rawDate: h.changeDate,
          title,
          color,
          description: (
            <>
              {h.changedBy?.name && (
                <p className="text-sm">Wykonał: {h.changedBy.name}</p>
              )}
              {h.notes && (
                <p className=" text-xs text-muted-foreground">
                  Uwagi: {h.notes}
                </p>
              )}
            </>
          ),
        })
      }
    }
  }

  /* ----------------------------------------------------------
   * 3️⃣ Sort chronologically (newest first, full precision)
   * ---------------------------------------------------------- */
  return (
    events
      .sort((a, b) => {
        const diff = b.rawDate.getTime() - a.rawDate.getTime()
        if (diff !== 0) return diff

        // Secondary sort: show history before attempts on same timestamp
        const aIsHistory = a.id.startsWith('history-')
        const bIsHistory = b.id.startsWith('history-')
        if (aIsHistory && !bIsHistory) return 1
        if (!aIsHistory && bIsHistory) return -1
        return 0
      })
      // Convert date to formatted string for display
      .map((e) => ({
        ...e,
        date: formatDateTime(e.rawDate),
      }))
  )
}
