'use client'

import { Skeleton } from '@/app/components/ui/skeleton'
import { getErrMessage } from '@/utils/errorHandler'
import { trpc } from '@/utils/trpc'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { usePlanningContext } from './PlanningContext'
import TechniciansTimeline from './TechniciansTimeline'

type Props = { setProcessing: (v: boolean) => void }

/**
 * TechniciansList
 * --------------------------------------------------
 * Displays technician timelines for the selected day.
 * - Uses date and searchTerm from PlanningContext (global).
 * - No local header (handled by PageControlBar).
 */
const TechniciansList = ({ setProcessing }: Props) => {
  const { selectedDate, searchTerm } = usePlanningContext()

  const trpcUtils = trpc.useUtils()

  const { data: assignments = [], isLoading } =
    trpc.order.getAssignedOrders.useQuery({
      date: selectedDate.toLocaleDateString('en-CA'),
    })

  const assignMutation = trpc.order.assignTechnician.useMutation({
    onError: (err) => toast.error(getErrMessage(err)),
  })

  /** Unassigns order from technician and refreshes cache. */
  const unassignOrder = async (orderId: string) => {
    setProcessing(true)
    try {
      await assignMutation.mutateAsync({ id: orderId, assignedToId: undefined })
      await Promise.all([
        trpcUtils.order.getUnassignedOrders.invalidate(),
        trpcUtils.order.getAssignedOrders.invalidate(),
      ])
    } catch (err: unknown) {
      toast.error(getErrMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  /** Filters technicians by search term (name) */
  const filteredTechnicians = useMemo(() => {
    const valid = assignments.filter((t) => t.technicianId && t.technicianName)
    if (!searchTerm) return valid
    const q = searchTerm.toLowerCase()
    return valid.filter((t) => t.technicianName.toLowerCase().includes(q))
  }, [assignments, searchTerm])

  return (
    <div className="space-y-4 w-full h-full max-w-full min-w-0">
      {isLoading ? (
        <TechniciansListSkeleton />
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex w-full h-52 items-center justify-center">
          <p className="text-center text-muted-foreground">
            Brak techników lub przypisanych zleceń.
          </p>
        </div>
      ) : (
        <TechniciansTimeline
          assignments={filteredTechnicians}
          onUnassign={unassignOrder}
        />
      )}
    </div>
  )
}

/**
 * TechniciansListSkeleton
 * --------------------------------------------------
 * Displays placeholder timeline grid while loading.
 */
const TechniciansListSkeleton = () => (
  <div className="w-full overflow-x-auto border rounded-md bg-background shadow-inner">
    <div
      className="grid border-b bg-muted font-medium text-sm sticky top-0 z-10"
      style={{ gridTemplateColumns: `200px repeat(15, 100px)` }}
    >
      {Array.from({ length: 15 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-10 w-[100px] border-r rounded-none border-gray-300"
        />
      ))}
    </div>
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="grid border-b text-sm"
        style={{ gridTemplateColumns: `200px repeat(14, 100px)` }}
      >
        <Skeleton className="h-10 w-full border-r rounded-none" />
        <div className="col-span-13 flex items-center">
          <Skeleton className="h-8 w-full mx-2" />
        </div>
      </div>
    ))}
  </div>
)

export default TechniciansList
