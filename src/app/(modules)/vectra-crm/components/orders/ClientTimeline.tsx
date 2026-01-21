'use client'

import {
  orderStatusToTimelineColor,
  orderTypeMap,
} from '@/app/(modules)/vectra-crm/lib/constants'
import { VectraClientHistoryItem } from '@/types/vectra-crm'
import { format } from 'date-fns'
import { Timeline } from '../../../../components/ui/timeline'

/**
 * ClientTimeline
 * --------------------------------------------------------------
 * Displays the complete timeline of all orders related to a client.
 * Each item represents an installation, service or outage event.
 * Works similarly to OrderTimeline but aggregates all client orders.
 */
interface ClientTimelineProps {
  clientOrders: VectraClientHistoryItem[]
}

export default function ClientTimeline({ clientOrders }: ClientTimelineProps) {
  if (!clientOrders?.length) return null

  const items = clientOrders.map((order) => ({
    id: order.id,
    date: format(order.date, 'dd.MM.yyyy'),
    title: `${orderTypeMap[order.type] ?? order.type} (${order.orderNumber})`,
    description: `${order.city}, ${order.street} — Wejście ${order.attemptNumber}`,
    color: orderStatusToTimelineColor[order.status],
  }))

  return (
    <section className="pt-3">
      <Timeline items={items} />
    </section>
  )
}
