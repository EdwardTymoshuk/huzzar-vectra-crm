'use client'

import { Timeline } from '@/app/components/ui/timeline'
import { mapOrderToTimelineVM } from '@/server/modules/opl-crm/helpers/mappers/mapOrderToTimelineVM'
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

export default function OplOrderTimeline({ order }: { order: FullOrder }) {
  const { role } = useRole()

  const timelineOrder = mapOrderToTimelineVM(order)
  const allEvents = getOplFullOrderTimeline(timelineOrder, role ?? 'TECHNICIAN')

  if (!allEvents.length) return null

  return (
    <section className="pt-3">
      <Timeline items={allEvents} />
    </section>
  )
}
