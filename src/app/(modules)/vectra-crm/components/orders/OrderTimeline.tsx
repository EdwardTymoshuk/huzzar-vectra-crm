'use client'

import { getFullOrderTimeline } from '@/app/(modules)/vectra-crm/utils/orders/getFullOrderTimeline'
import { mapOrderToTimelineVM } from '@/server/modules/vectra-crm/helpers/mappers/mapOrderToTimelineVM'
import { RouterOutputs } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { Timeline } from '../../../../components/ui/timeline'

/**
 * OrderTimeline
 * --------------------------------------------------------------
 * Displays timeline of attempts (and optionally history)
 * using the universal <Timeline /> component.
 */

type FullOrder = RouterOutputs['vectra']['order']['getOrderById']

export default function OrderTimeline({ order }: { order: FullOrder }) {
  const { role } = useRole()

  const timelineOrder = mapOrderToTimelineVM(order)
  const allEvents = getFullOrderTimeline(timelineOrder, role ?? 'TECHNICIAN')

  if (!allEvents.length) return null

  return (
    <section className="pt-3">
      <Timeline items={allEvents} />
    </section>
  )
}
