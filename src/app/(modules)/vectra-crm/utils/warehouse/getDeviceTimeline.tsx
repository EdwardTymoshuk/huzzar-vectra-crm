// utils.vectra.warehouse/getDeviceTimeline.ts

import { CleanTimelineItem } from '@/app/components/ui/timeline'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { VectraWarehouseAction } from '@prisma/client'

export type DeviceHistoryEntry = {
  id: string
  action: VectraWarehouseAction
  actionDate: Date
  notes: string | null
  quantity: number | null
  performedBy: { id: string; name: string } | null
  assignedTo: { id: string; name: string } | null
  assignedOrder: { id: string; orderNumber: string } | null
  fromLocation: { id: string; name: string } | null
  toLocation: { id: string; name: string } | null
}

/**
 * Maps device-related warehouse events into timeline-friendly items.
 * Location logic:
 * - RECEIVED / RETURNED → show only 'toLocation'
 * - TRANSFER → show from → to
 * - Other events → no location arrow unless both exist
 */
export function getDeviceTimeline(
  history: DeviceHistoryEntry[]
): CleanTimelineItem[] {
  if (!history.length) return []

  return history.map((h): CleanTimelineItem => {
    let title = ''
    let color: CleanTimelineItem['color'] = 'secondary'

    switch (h.action) {
      case 'RECEIVED':
        title = 'Przyjęto na magazyn'
        color = 'success'
        break
      case 'ISSUED':
        title = 'Wydano technikowi'
        color = 'warning'
        break
      case 'RETURNED':
        title = 'Zwrot do magazynu'
        color = 'secondary'
        break
      case 'RETURNED_TO_OPERATOR':
        title = 'Zwrot do operatora'
        color = 'danger'
        break
      case 'RETURNED_TO_TECHNICIAN':
        title = 'Zwrot do technika'
        color = 'warning'
        break
      case 'TRANSFER':
        title = 'Transfer między lokalizacjami'
        color = 'secondary'
        break
      case 'COLLECTED_FROM_CLIENT':
        title = 'Odebrane od klienta'
        color = 'warning'
        break
      case 'ASSIGNED_TO_ORDER':
        title = 'Przypisano do zlecenia'
        color = 'secondary'
        break
      case 'ISSUED_TO_CLIENT':
        title = 'Wydano klientowi'
        color = 'success'
        break
      default:
        title = h.action
    }

    const descParts: string[] = []

    // kto wykonał operację
    if (h.performedBy?.name) {
      descParts.push(`Wykonał: ${h.performedBy.name}`)
    }

    // technik (ISSUED)
    if (h.assignedTo?.name) {
      descParts.push(`Technik: ${h.assignedTo.name}`)
    }

    // zlecenie (ASSIGNED_TO_ORDER)
    if (h.assignedOrder?.orderNumber) {
      descParts.push(`Zlecenie: ${h.assignedOrder.orderNumber}`)
    }

    // ilość (materiały)
    if (h.quantity !== null) {
      descParts.push(`Ilość: ${h.quantity}`)
    }

    // ⭐ poprawiona logika lokalizacji
    if (h.action === 'TRANSFER' && h.fromLocation && h.toLocation) {
      descParts.push(
        `Lokalizacja: ${h.fromLocation.name} → ${h.toLocation.name}`
      )
    } else if (h.action === 'RECEIVED' && h.toLocation?.name) {
      descParts.push(`Lokalizacja: ${h.toLocation.name}`)
    } else if (h.action === 'RETURNED' && h.toLocation?.name) {
      descParts.push(`Lokalizacja: ${h.toLocation.name}`)
    } else if (
      h.toLocation?.name // fallback only when toLocation exists
    ) {
      descParts.push(`Lokalizacja: ${h.toLocation.name}`)
    }

    // uwagi
    if (h.notes) {
      descParts.push(`Uwagi: ${h.notes}`)
    }

    return {
      id: h.id,
      date: formatDateTime(h.actionDate),
      title,
      color,
      description: descParts.length ? (
        <div className="space-y-0.5">
          {descParts.map((text) => (
            <p
              key={text}
              className="text-xs text-muted-foreground leading-snug"
            >
              {text}
            </p>
          ))}
        </div>
      ) : undefined,
    }
  })
}
