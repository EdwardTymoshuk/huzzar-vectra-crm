import { statusMap } from '@/lib/constants'
import { VectraOrderWithAttempts } from '@/types/vectra-crm'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { Role, VectraOrderStatus, VectraOrderType } from '@prisma/client'
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

function buildCreationTitle(
  note?: string,
  attemptNumber?: number,
  methodOverride?: 'import' | 'ręcznie'
) {
  const method =
    methodOverride ?? determineCreationMethod(note) ?? 'ręcznie'
  const attempt = attemptNumber ?? parseAttemptNumberFromNote(note) ?? 1
  return `Utworzono zlecenie (${method}) | Wejście ${attempt}`
}

function buildAttemptDescription(
  attempt: VectraOrderWithAttempts['attempts'][number]
) {
  return (
    <>
      {attempt.assignedTo?.name && (
        <p className="text-sm">{attempt.assignedTo.name}</p>
      )}
      {attempt.status !== 'COMPLETED' && attempt.failureReason && (
        <p className="text-xs text-muted-foreground font-medium">
          Powód: {attempt.failureReason}
        </p>
      )}
    </>
  )
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

export function getFullOrderTimeline(
  order: VectraOrderWithAttempts & {
    type: VectraOrderType
    closedAt?: Date | null
    history?: {
      id: string
      changeDate: Date
      statusBefore?: VectraOrderStatus
      statusAfter?: VectraOrderStatus
      notes?: string | null
      changedBy?: { name: string } | null
    }[]
  },
  role: Role
) {
  const events: TimelineEvent[] = []

  const pushEvent = (
    item: TimelineEvent
  ) => {
    events.push(item)
  }

  /**
   * Attempts (visible for everyone)
   */
  if (order.attempts?.length) {
    for (const attempt of order.attempts) {
      const displayDate =
        attempt.completedAt ?? attempt.closedAt ?? attempt.createdAt ?? attempt.date
      if (!displayDate) continue

      const isCompleted = attempt.status === 'COMPLETED'
      const title = isCompleted ? 'WYKONANE' : 'NIE WYKONANE'
      const color = isCompleted ? 'success' : 'danger'

      pushEvent({
        id: `attempt-${attempt.id}`,
        rawDate: displayDate,
        title,
        color,
        description: (
          <>
            {buildAttemptDescription(attempt)}
          </>
        ),
      })
    }
  }

  /**
   * History entries (admins/coordinators see everything)
   */
  const isPrivileged = role === 'ADMIN' || role === 'COORDINATOR'

  const builtCreationNumbers = new Set<number>()

  if (isPrivileged && order.history?.length) {
    for (const history of order.history) {
      const note = history.notes
      const lowerNote = note?.toLowerCase() ?? ''
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

        pushEvent({
          id: `history-${history.id}-creation`,
          rawDate: history.changeDate,
          title: buildCreationTitle(note, attemptNumber ?? undefined),
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
        pushEvent({
          id: `history-${history.id}`,
          rawDate: history.changeDate,
          title: buildCreationTitle(note, attemptNumber),
          color: 'secondary',
          description: history.changedBy?.name ? (
            <p className="text-sm">{history.changedBy.name}</p>
          ) : undefined,
        })
        continue
      }

      const isStatusChange =
        history.statusBefore &&
        history.statusAfter &&
        history.statusBefore !== history.statusAfter

      if (isStatusChange) {
        const title = `ZMIANA STATUSU: ${statusMap[history.statusBefore]} → ${
          statusMap[history.statusAfter]
        }`
        const editedAfterCompletion =
          order.closedAt &&
          history.changeDate.getTime() > order.closedAt.getTime()

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
              {history.notes && (
                <p className="text-xs text-muted-foreground">
                  Uwagi: {history.notes}
                </p>
              )}
            </>
          ),
        })
        continue
      }

      if (isTransfer) {
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
              {history.notes && (
                <p className="text-xs text-muted-foreground">{history.notes}</p>
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
              {history.notes && (
                <p className="text-xs text-muted-foreground">{history.notes}</p>
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
            {history.notes && (
              <p className="text-xs text-muted-foreground">{history.notes}</p>
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

  // Ensure every attempt has a creation entry
  const attemptNumbers = order.attempts
    ?.map((a) => a.attemptNumber)
    .filter((n): n is number => typeof n === 'number')
    .sort((a, b) => b - a)
  if (attemptNumbers?.length) {
    for (const attemptNumber of attemptNumbers) {
      if (builtCreationNumbers.has(attemptNumber)) continue
      const attempt = order.attempts?.find(
        (a) => a.attemptNumber === attemptNumber
      )
      if (!attempt) continue
      pushEvent({
        id: `creation-synth-${attempt.id}`,
        rawDate: attempt.createdAt ?? attempt.date ?? new Date(),
        title: buildCreationTitle(undefined, attemptNumber),
        color: 'secondary',
        description: attempt.assignedTo?.name ? (
          <p className="text-sm">{attempt.assignedTo.name}</p>
        ) : undefined,
      })
    }
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
