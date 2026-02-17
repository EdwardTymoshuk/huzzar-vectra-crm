import { statusMap } from '@/lib/constants'
import { OplOrderWithAttempts } from '@/types/opl-crm'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { OplOrderStatus, OplOrderType, Role } from '@prisma/client'
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
export function getOplFullOrderTimeline(
  order: OplOrderWithAttempts & {
    type: OplOrderType
    completedAt?: Date | null
    closedAt?: Date | null
    history?: {
      id: string
      changeDate: Date
      statusBefore?: OplOrderStatus
      statusAfter?: OplOrderStatus
      notes?: string | null
      changedBy?: { name: string } | null
    }[]
  },
  role: Role,
  options?: {
    onOpenOrder?: (orderId: string) => void
  }
) {
  const humanStatusLabel = (status?: OplOrderStatus) => {
    if (!status) return 'Aktualizacja'
    if (status === 'COMPLETED') return 'Skuteczne'
    if (status === 'NOT_COMPLETED') return 'Nieskuteczne'
    if (status === 'ASSIGNED') return 'Przypisane do realizacji'
    if (status === 'PENDING') return 'Oczekujące'
    return statusMap[status] ?? status
  }

  const isSystemNote = (note?: string | null) => {
    const value = note?.toLowerCase() ?? ''
    if (!value) return true
    return (
      value.includes('pierwsze wejście') ||
      value.includes('ponowne podejście') ||
      value.includes('utworzono zlecenie') ||
      value.includes('dodano zlecenie') ||
      value.includes('zmieniono status przez edycję') ||
      value.includes('zlecenie poprawione przez technika') ||
      value.includes('zlecenie zakończone przez technika') ||
      value.includes('zlecenie oznaczone jako niewykonane przez technika') ||
      value.includes('zlecenie edytowane przez administratora') ||
      value.includes('utworzono kolejne podejście') ||
      value.includes('[solo')
    )
  }

  const cleanNote = (note?: string | null) =>
    (note ?? '').replace(/\s*\[SOLO:[^\]]+\]\s*/gi, '').trim()

  const isTechnician = role === 'TECHNICIAN'
  const events: {
    id: string
    rawDate: Date
    title: string
    description?: ReactNode
    color: 'success' | 'danger' | 'warning' | 'secondary'
  }[] = []

  if (isTechnician) {
    const assignedEvent = order.history
      ?.filter((h) => h.statusAfter === 'ASSIGNED')
      .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime())[0]

    if (assignedEvent) {
      events.push({
        id: `history-assigned-${assignedEvent.id}`,
        rawDate: assignedEvent.changeDate,
        title: 'Przypisane do realizacji',
        color: 'warning',
      })
    }

    const latestCompletedAttempt = [...(order.attempts ?? [])]
      .filter((a) => a.status === 'COMPLETED' || a.status === 'NOT_COMPLETED')
      .sort((a, b) => b.attemptNumber - a.attemptNumber)[0]

    if (latestCompletedAttempt) {
      events.push({
        id: `attempt-final-${latestCompletedAttempt.id}`,
        rawDate:
          latestCompletedAttempt.completedAt ??
          latestCompletedAttempt.closedAt ??
          latestCompletedAttempt.createdAt ??
          latestCompletedAttempt.date,
        title: `Wejście ${latestCompletedAttempt.attemptNumber} — ${humanStatusLabel(
          latestCompletedAttempt.status
        )}`,
        color: latestCompletedAttempt.status === 'COMPLETED' ? 'success' : 'danger',
      })
    } else if (
      order.status === 'COMPLETED' ||
      order.status === 'NOT_COMPLETED'
    ) {
      const completedHistory = [...(order.history ?? [])]
        .filter((h) => h.statusAfter === order.status)
        .sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())[0]

      events.push({
        id: `order-final-${order.id}`,
        rawDate:
          order.completedAt ??
          order.closedAt ??
          completedHistory?.changeDate ??
          order.date,
        title: `Wejście ${order.attemptNumber} — ${humanStatusLabel(order.status)}`,
        color: order.status === 'COMPLETED' ? 'success' : 'danger',
      })
    }

    return events
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      .map((e) => ({
        ...e,
        date: formatDateTime(e.rawDate),
      }))
  }

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
        title: `Wejście ${a.attemptNumber} — ${humanStatusLabel(a.status)}`,
        color,
        description: (
          <>
            {a.assignedTechnicians?.length > 0 && (
              <p>
                Technik: {a.assignedTechnicians.map((t) => t.name).join(' + ')}
              </p>
            )}

            {a.status === 'NOT_COMPLETED' && a.failureReason && (
              <p className=" text-muted-foreground text-xs font-medium">
                Powód: {a.failureReason}
              </p>
            )}
            {(a.status === 'COMPLETED' || a.status === 'NOT_COMPLETED') &&
              a.notes &&
              !isSystemNote(a.notes) && (
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
        else if (h.statusAfter) {
          title = humanStatusLabel(h.statusAfter)
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
              {h.notes && !isSystemNote(h.notes) && (
                <p className=" text-xs text-muted-foreground">
                  Uwagi: {cleanNote(h.notes)}
                </p>
              )}
            </>
          ),
        })
      }
    }

    if (order.previousOrder) {
      events.push({
        id: `previous-attempt-${order.previousOrder.id}`,
        rawDate: order.date,
        title: `Poprzednie wejście (${order.previousOrder.attemptNumber}) — ${humanStatusLabel(
          order.previousOrder.status
        )}`,
        color:
          order.previousOrder.status === 'COMPLETED'
            ? 'success'
            : order.previousOrder.status === 'NOT_COMPLETED'
              ? 'danger'
              : 'warning',
        description: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Wykonał:{' '}
              {order.previousOrder.completedByName ??
                order.previousOrder.assignedTechnicians
                  ?.map((t) => t.name)
                  .join(' + ') ??
                '-'}
            </p>
            <button
              type="button"
              onClick={() => options?.onOpenOrder?.(order.previousOrder!.id)}
              className="text-destructive underline underline-offset-2"
            >
              Nr zlecenia: {order.orderNumber}
            </button>
          </div>
        ),
      })
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
