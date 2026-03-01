import { statusMap } from '@/lib/constants'
import { OplOrderWithAttempts } from '@/types/opl-crm'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { OplOrderCreatedSource, OplOrderStatus, OplOrderType, Role } from '@prisma/client'
import { ReactNode } from 'react'

type TimelineEvent = {
  id: string
  rawDate: Date
  title: string
  description?: ReactNode
  color: 'success' | 'danger' | 'warning' | 'secondary'
}

const CREATION_KEYWORDS = ['utworzono', 'dodano zlecenie']
const TRANSFER_KEYWORDS = ['przekaz', 'przenies', 'przekazane']
const ORDER_EDIT_KEYWORDS = ['zlecenie edytowane', 'zmieniono dane zlecenia']
const NEW_ATTEMPT_KEYWORDS = ['kolejne podejście', 'kolejne wejście', 'następne wejście']

function isCreationNote(note?: string) {
  if (!note) return false
  const lower = note.toLowerCase()
  return CREATION_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function parseAttemptNumberFromNote(note?: string): number | null {
  if (!note) return null
  const match = note.match(/wej(?:\u015B|s|ſ)\s*([\d]+)/i)
  if (match && match[1]) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function isNewAttemptNote(note?: string) {
  if (!note) return false
  const lower = note.toLowerCase()
  return NEW_ATTEMPT_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function parseAttemptNumberFromNewAttempt(note?: string, fallback?: number) {
  return parseAttemptNumberFromNote(note) ?? fallback ?? null
}

function determineCreationMethod(note?: string) {
  const lower = (note ?? '').toLowerCase()
  if (lower.includes('import')) return 'import'
  return 'ręcznie'
}

function methodFromCreatedSource(source?: OplOrderCreatedSource | null) {
  if (!source) return null
  return source === 'PLANNER' ? 'import' : 'ręcznie'
}

function buildCreationTitle(
  note?: string,
  attemptNumber?: number,
  methodOverride?: 'import' | 'ręcznie'
) {
  const method = methodOverride ?? determineCreationMethod(note) ?? 'ręcznie'
  const attempt = attemptNumber ?? parseAttemptNumberFromNote(note) ?? 1
  return `Utworzono zlecenie (${method}) | Wejście ${attempt}`
}

function isTransferNote(note?: string) {
  if (!note) return false
  const lower = note.toLowerCase()
  return TRANSFER_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function isOrderEditNote(note?: string) {
  if (!note) return false
  const lower = note.toLowerCase()
  return ORDER_EDIT_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function buildAttemptDescription(attempt: OplOrderWithAttempts['attempts'][number]) {
  return (
    <>
      {attempt.assignedTechnicians?.length > 0 && (
        <p className="text-sm">
          {attempt.assignedTechnicians.map((t) => t.name).join(' + ')}
        </p>
      )}
      {attempt.status !== 'COMPLETED' && attempt.failureReason && (
        <p className="text-xs text-muted-foreground font-medium">
          Powód: {attempt.failureReason}
        </p>
      )}
    </>
  )
}

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
  const isPrivileged = role === 'ADMIN' || role === 'COORDINATOR'
  const events: TimelineEvent[] = []

  const attemptsChronological = [...(order.attempts ?? [])].sort((a, b) => {
    const aTime = (a.createdAt ?? a.date)?.getTime?.() ?? 0
    const bTime = (b.createdAt ?? b.date)?.getTime?.() ?? 0
    return aTime - bTime
  })
  const displayAttemptById = new Map(
    attemptsChronological.map((attempt, index) => [attempt.id, index + 1])
  )

  const pushEvent = (item: TimelineEvent) => {
    events.push(item)
  }

  if (isTechnician) {
    const assignedEvent = order.history
      ?.filter((h) => h.statusAfter === 'ASSIGNED')
      .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime())[0]

    if (assignedEvent) {
      pushEvent({
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
      pushEvent({
        id: `attempt-final-${latestCompletedAttempt.id}`,
        rawDate:
          latestCompletedAttempt.completedAt ??
          latestCompletedAttempt.closedAt ??
          latestCompletedAttempt.createdAt ??
          latestCompletedAttempt.date,
        title:
          latestCompletedAttempt.status === 'COMPLETED'
            ? 'WYKONANE'
            : 'NIE WYKONANE',
        color:
          latestCompletedAttempt.status === 'COMPLETED' ? 'success' : 'danger',
        description: buildAttemptDescription(latestCompletedAttempt),
      })
    } else if (
      order.status === 'COMPLETED' ||
      order.status === 'NOT_COMPLETED'
    ) {
      const completedHistory = [...(order.history ?? [])]
        .filter((h) => h.statusAfter === order.status)
        .sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())[0]

      pushEvent({
        id: `order-final-${order.id}`,
        rawDate:
          order.completedAt ?? order.closedAt ?? completedHistory?.changeDate ?? order.date,
        title: order.status === 'COMPLETED' ? 'WYKONANE' : 'NIE WYKONANE',
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

  if (order.attempts?.length) {
    for (const attempt of order.attempts) {
      const color =
        attempt.status === 'COMPLETED'
          ? 'success'
          : attempt.status === 'NOT_COMPLETED'
            ? 'danger'
            : 'warning'

      const displayDate =
        attempt.completedAt ?? attempt.closedAt ?? attempt.createdAt ?? attempt.date

      if (!displayDate) continue

      let title = humanStatusLabel(attempt.status)
      if (attempt.status === 'COMPLETED') title = 'WYKONANE'
      if (attempt.status === 'NOT_COMPLETED') title = 'NIE WYKONANE'

      pushEvent({
        id: `attempt-${attempt.id}`,
        rawDate: displayDate,
        title,
        color,
        description: buildAttemptDescription(attempt),
      })
    }
  }

  // Some OPL orders keep final completion only on order/history level (not on attempt).
  // In that case add a synthetic final event so the timeline still shows WYKONANE/NIE WYKONANE.
  const hasFinalAttemptEvent = (order.attempts ?? []).some(
    (attempt) =>
      attempt.status === 'COMPLETED' || attempt.status === 'NOT_COMPLETED'
  )

  if (
    !hasFinalAttemptEvent &&
    (order.status === 'COMPLETED' || order.status === 'NOT_COMPLETED')
  ) {
    const completedHistory = [...(order.history ?? [])]
      .filter((h) => h.statusAfter === order.status)
      .sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())[0]

    pushEvent({
      id: `order-final-${order.id}`,
      rawDate:
        order.completedAt ?? order.closedAt ?? completedHistory?.changeDate ?? order.date,
      title: order.status === 'COMPLETED' ? 'WYKONANE' : 'NIE WYKONANE',
      color: order.status === 'COMPLETED' ? 'success' : 'danger',
      description:
        order.assignedTechnicians?.length > 0 ? (
          <p className="text-sm">
            {order.assignedTechnicians.map((t) => t.name).join(' + ')}
          </p>
        ) : undefined,
    })
  }

  const builtCreationNumbers = new Set<number>()

  if (isPrivileged && order.history?.length) {
    for (const history of order.history) {
      const note = cleanNote(history.notes)
      const isNewAttempt = isNewAttemptNote(note)
      const isCreation = isCreationNote(note)
      const isTransfer = isTransferNote(note)
      const isOrderEdit = isOrderEditNote(note)

      if (isNewAttempt) {
        const attemptNumber =
          parseAttemptNumberFromNewAttempt(
            note,
            order.attempts?.length
              ? Math.max(...order.attempts.map((a) => a.attemptNumber ?? 0))
              : 1
          ) ?? null

        if (attemptNumber) builtCreationNumbers.add(attemptNumber)
        const attemptForNumber = attemptNumber
          ? attemptsChronological.find(
              (a) => (displayAttemptById.get(a.id) ?? a.attemptNumber) === attemptNumber
            )
          : null

        pushEvent({
          id: `history-${history.id}-creation`,
          rawDate: history.changeDate,
          title: buildCreationTitle(
            note,
            attemptNumber ?? undefined,
            methodFromCreatedSource(attemptForNumber?.createdSource) ?? undefined
          ),
          color: 'secondary',
          description: history.changedBy?.name ? (
            <p className="text-sm">{history.changedBy.name}</p>
          ) : undefined,
        })
        continue
      }

      if (isCreation) {
        const attemptNumber =
          parseAttemptNumberFromNote(note) ?? order.attempts?.[0]?.attemptNumber ?? 1
        builtCreationNumbers.add(attemptNumber)
        const attemptForNumber = attemptsChronological.find(
          (a) => (displayAttemptById.get(a.id) ?? a.attemptNumber) === attemptNumber
        )
        const methodOverride =
          methodFromCreatedSource(attemptForNumber?.createdSource) ??
          (attemptNumber === order.attemptNumber
            ? methodFromCreatedSource(order.createdSource)
            : null) ??
          undefined

        pushEvent({
          id: `history-${history.id}`,
          rawDate: history.changeDate,
          title: buildCreationTitle(note, attemptNumber, methodOverride),
          color: 'secondary',
          description: history.changedBy?.name ? (
            <p className="text-sm">{history.changedBy.name}</p>
          ) : undefined,
        })
        continue
      }

      if (isTransfer) {
        const transferTarget =
          note?.match(/do technika\s+(.+)$/i)?.[1]?.trim() ?? null

        pushEvent({
          id: `history-${history.id}`,
          rawDate: history.changeDate,
          title: 'Przekazanie zlecenia',
          color: 'warning',
          description: (
            <>
              {history.changedBy?.name && (
                <p className="text-sm">{history.changedBy.name}</p>
              )}
              {transferTarget && (
                <p className="text-xs text-muted-foreground">
                  Przekazano do: {transferTarget}
                </p>
              )}
            </>
          ),
        })
        continue
      }

      const isStatusChange =
        history.statusBefore &&
        history.statusAfter &&
        history.statusBefore !== history.statusAfter

      if (isStatusChange) {
        if (
          history.statusAfter === 'COMPLETED' ||
          history.statusAfter === 'NOT_COMPLETED'
        ) {
          // Completion/non-completion is already shown as a dedicated attempt event.
          continue
        }

        const statusBefore = history.statusBefore as OplOrderStatus
        const statusAfter = history.statusAfter as OplOrderStatus
        const title = `ZMIANA STATUSU: ${statusMap[statusBefore]} → ${statusMap[statusAfter]}`
        const editedAfterCompletion =
          order.closedAt && history.changeDate.getTime() > order.closedAt.getTime()

        pushEvent({
          id: `history-${history.id}`,
          rawDate: history.changeDate,
          title,
          color: editedAfterCompletion ? 'warning' : 'secondary',
          description: (
            <>
              {history.changedBy?.name && (
                <p className="text-sm">{history.changedBy.name}</p>
              )}
              {editedAfterCompletion && (
                <p className="text-xs text-warning">
                  Modyfikacja po zakończeniu zlecenia
                </p>
              )}
              {note && !isSystemNote(note) && (
                <p className="text-xs text-muted-foreground">Uwagi: {note}</p>
              )}
            </>
          ),
        })
        continue
      }

      if (isOrderEdit) {
        pushEvent({
          id: `history-${history.id}`,
          rawDate: history.changeDate,
          title: 'Edycja zlecenia',
          color: 'warning',
          description: (
            <>
              {history.changedBy?.name && (
                <p className="text-sm">{history.changedBy.name}</p>
              )}
              {note && !isSystemNote(note) && (
                <p className="text-xs text-muted-foreground">{note}</p>
              )}
            </>
          ),
        })
        continue
      }

      pushEvent({
        id: `history-${history.id}`,
        rawDate: history.changeDate,
        title: 'Edycja odpisu',
        color: 'warning',
        description: (
          <>
            {history.changedBy?.name && (
              <p className="text-sm">{history.changedBy.name}</p>
            )}
            {note && !isSystemNote(note) && (
              <p className="text-xs text-muted-foreground">{note}</p>
            )}
          </>
        ),
      })
    }
  }

  if (
    isPrivileged &&
    order.closedAt &&
    (order.type === 'SERVICE' || order.type === 'OUTAGE')
  ) {
    pushEvent({
      id: `closed-${order.id}`,
      rawDate: order.closedAt,
      title: 'Zlecenie zatwierdzone przez koordynatora',
      color: 'secondary',
      description: (
        <p className="text-xs text-muted-foreground">
          Rozliczenie i ostateczna akceptacja zlecenia.
        </p>
      ),
    })
  }

  const attemptNumbers = order.attempts
    ?.map((a) => displayAttemptById.get(a.id) ?? a.attemptNumber)
    .filter((n): n is number => typeof n === 'number')
    .sort((a, b) => b - a)

  if (attemptNumbers?.length) {
    for (const attemptNumber of attemptNumbers) {
      if (builtCreationNumbers.has(attemptNumber)) continue
      const attempt = attemptsChronological.find(
        (a) => (displayAttemptById.get(a.id) ?? a.attemptNumber) === attemptNumber
      )
      if (!attempt) continue

      pushEvent({
        id: `creation-synth-${attempt.id}`,
        rawDate: attempt.createdAt ?? attempt.date ?? new Date(),
        title: buildCreationTitle(
          undefined,
          attemptNumber,
          methodFromCreatedSource(attempt.createdSource) ??
            (attemptNumber === order.attemptNumber
              ? methodFromCreatedSource(order.createdSource)
              : null) ??
            undefined
        ),
        color: 'secondary',
        description:
          attempt.assignedTechnicians?.length > 0 ? (
            <p className="text-sm">
              {attempt.assignedTechnicians.map((t) => t.name).join(' + ')}
            </p>
          ) : undefined,
      })
    }
  }

  if (isPrivileged && order.previousOrder) {
    const previousDisplayAttempt =
      displayAttemptById.get(order.previousOrder.id) ??
      order.previousOrder.attemptNumber

    pushEvent({
      id: `previous-attempt-${order.previousOrder.id}`,
      rawDate:
        order.previousOrder.completedAt ??
        order.previousOrder.closedAt ??
        order.previousOrder.date ??
        order.date,
      title: `Poprzednie wejście (${previousDisplayAttempt}) — ${humanStatusLabel(
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

  return events
    .sort((a, b) => {
      const diff = b.rawDate.getTime() - a.rawDate.getTime()
      if (diff !== 0) return diff

      const aIsHistory = a.id.startsWith('history-')
      const bIsHistory = b.id.startsWith('history-')
      if (aIsHistory && !bIsHistory) return 1
      if (!aIsHistory && bIsHistory) return -1
      return 0
    })
    .map((event) => ({
      ...event,
      date: formatDateTime(event.rawDate),
    }))
}
