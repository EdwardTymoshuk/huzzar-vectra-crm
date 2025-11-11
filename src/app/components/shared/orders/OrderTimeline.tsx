'use client'

import { OrderWithAttempts } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { getFullOrderTimeline } from '@/utils/orders/getFullOrderTimeline'
import { Timeline } from '../../ui/timeline'

/**
 * OrderTimeline
 * --------------------------------------------------------------
 * Displays timeline of attempts (and optionally history)
 * using the universal <Timeline /> component.
 */
export default function OrderTimeline({
  order,
}: {
  order: OrderWithAttempts & {
    history?: {
      id: string
      changeDate: Date
      status?: string | null
      notes?: string | null
      changedBy?: { name: string } | null
    }[]
  }
}) {
  const { role } = useRole()
  const allEvents = getFullOrderTimeline(order, role ?? 'TECHNICIAN')

  if (!allEvents.length) return null

  return (
    <section className="pt-3">
      <Timeline items={allEvents} />
    </section>
  )
}
