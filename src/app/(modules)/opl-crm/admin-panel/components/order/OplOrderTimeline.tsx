'use client'

import { Timeline } from '@/app/components/ui/timeline'
import { mapOrderToTimelineVM } from '@/server/modules/opl-crm/helpers/mappers/mapOplOrderToTimelineVM'
import { RouterOutputs } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { getOplFullOrderTimeline } from '../../../utils/order/getOplFullOrderTimeline'

/**
 * OplOrderTimeline
 * --------------------------------------------------------------
 * Displays timeline of attempts (and optionally history)
 * using the universal <Timeline /> component.
 */

type FullOrder = RouterOutputs['opl']['order']['getOrderById']

export default function OplOrderTimeline({
  order,
  onOpenOrder,
}: {
  order: FullOrder
  onOpenOrder?: (orderId: string) => void
}) {
  const { role } = useRole()

  const timelineOrder = mapOrderToTimelineVM(order)
  const allEvents = getOplFullOrderTimeline(timelineOrder, role ?? 'TECHNICIAN', {
    onOpenOrder,
  })

  if (!allEvents.length) return null

  return (
    <section className="pt-3">
      <Timeline items={allEvents} />
    </section>
  )
}
