'use client'

import { Skeleton } from '@/app/components/ui/skeleton'
import { OplTechnicianAssignment } from '@/types/opl-crm'
import { getErrMessage } from '@/utils/errorHandler'
import { matchSearch } from '@/utils/searchUtils'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { groupAssignmentsForTeams } from './groupAssignments'
import { usePlanningContext } from './PlanningContext'
import TechniciansTimeline from './TechniciansTimeline'

type Props = {
  setProcessing: (v: boolean) => void
  assignments: OplTechnicianAssignment[]
  isLoading: boolean
  onOrderClick?: (orderId: string) => void
}

/**
 * TechniciansList
 * --------------------------------------------------
 * Displays technician timelines for the selected day.
 * - Uses date and searchTerm from PlanningContext (global).
 * - No local header (handled by PageControlBar).
 */
const TechniciansList = ({
  setProcessing,
  assignments,
  isLoading,
  onOrderClick,
}: Props) => {
  const { searchTerm } = usePlanningContext()
  const [reorderMode, setReorderMode] = useState(false)
  const [techOrder, setTechOrder] = useState<string[]>([])
  const TECH_ORDER_STORAGE_KEY = 'opl-planner-tech-order-v1'

  const trpcUtils = trpc.useUtils()
  const groupedAssignments = useMemo(
    () => groupAssignmentsForTeams(assignments),
    [assignments]
  )
  const baseTechnicianIds = useMemo(
    () =>
      groupedAssignments
        .filter((row) => row.technicianId && !(row.teamTechnicianIds?.length ?? 0))
        .map((row) => row.technicianId!) as string[],
    [groupedAssignments]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(TECH_ORDER_STORAGE_KEY)
    if (!raw) {
      setTechOrder(baseTechnicianIds)
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setTechOrder(baseTechnicianIds)
        return
      }
      const persisted = parsed.filter((id): id is string => typeof id === 'string')
      const known = persisted.filter((id) => baseTechnicianIds.includes(id))
      const missing = baseTechnicianIds.filter((id) => !known.includes(id))
      setTechOrder([...known, ...missing])
    } catch {
      setTechOrder(baseTechnicianIds)
    }
  }, [baseTechnicianIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (techOrder.length === 0) return
    window.localStorage.setItem(TECH_ORDER_STORAGE_KEY, JSON.stringify(techOrder))
  }, [techOrder])

  const orderedAssignments = useMemo(() => {
    const indexMap = new Map(techOrder.map((id, idx) => [id, idx]))
    const fallbackBase = techOrder.length + 100

    const rankForRow = (row: OplTechnicianAssignment) => {
      if (row.teamTechnicianIds && row.teamTechnicianIds.length > 1) {
        const indices = row.teamTechnicianIds
          .map((id) => indexMap.get(id))
          .filter((v): v is number => typeof v === 'number')
        if (indices.length > 0) return Math.min(...indices)
        return fallbackBase
      }
      if (row.technicianId) {
        return indexMap.get(row.technicianId) ?? fallbackBase
      }
      return fallbackBase
    }

    return [...groupedAssignments].sort((a, b) => {
      const diff = rankForRow(a) - rankForRow(b)
      if (diff !== 0) return diff
      return a.technicianName.localeCompare(b.technicianName, 'pl')
    })
  }, [groupedAssignments, techOrder])

  const reorderTechnicians = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setTechOrder((prev) => {
      const current = prev.length > 0 ? [...prev] : [...baseTechnicianIds]
      const sourceIndex = current.indexOf(sourceId)
      const targetIndex = current.indexOf(targetId)
      if (sourceIndex === -1 || targetIndex === -1) return current
      const [moved] = current.splice(sourceIndex, 1)
      current.splice(targetIndex, 0, moved)
      return current
    })
  }

  const assignMutation = trpc.opl.order.assignTechnician.useMutation({
    onError: (err) => toast.error(getErrMessage(err)),
  })

  /** Unassigns order from technician and refreshes cache. */
  const unassignOrder = async (orderId: string) => {
    setProcessing(true)
    try {
      await assignMutation.mutateAsync({ id: orderId, technicianId: undefined })
      await Promise.all([
        trpcUtils.opl.order.getUnassignedOrders.invalidate(),
        trpcUtils.opl.order.getAssignedOrders.invalidate(),
      ])
    } catch (err: unknown) {
      toast.error(getErrMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  const filteredAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return orderedAssignments

    return orderedAssignments
      .map((tech) => {
        const technicianMatches = matchSearch(term, tech.technicianName)

        const filteredSlots = tech.slots
          .map((slot) => {
            const filteredOrders = slot.orders.filter((o) =>
              matchSearch(term, o.orderNumber, o.address)
            )
            return { ...slot, orders: filteredOrders }
          })
          .filter((slot) => slot.orders.length > 0)

        if (technicianMatches) {
          return tech
        }

        if (filteredSlots.length > 0) {
          return { ...tech, slots: filteredSlots }
        }

        return null
      })
      .filter(Boolean) as typeof assignments
  }, [orderedAssignments, searchTerm])

  return (
    <div className="space-y-4 w-full h-full max-w-full min-w-0">
      {isLoading ? (
        <TechniciansListSkeleton />
      ) : filteredAssignments.length === 0 ? (
        <div className="flex w-full min-w-[70%] h-52 items-center justify-center">
          <p className="text-center text-muted-foreground">
            Brak techników lub przypisanych zleceń.
          </p>
        </div>
      ) : (
        <TechniciansTimeline
          assignments={filteredAssignments}
          onUnassign={unassignOrder}
          onOrderClick={onOrderClick}
          reorderMode={reorderMode}
          onToggleReorderMode={() => setReorderMode((v) => !v)}
          onReorderTechnicians={reorderTechnicians}
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
    <div className="min-w-[1250px]">
      <div
        className="grid border-b bg-muted font-medium text-sm sticky top-0 z-10"
        style={{ gridTemplateColumns: `200px repeat(14, 75px)` }}
      >
        <Skeleton className="h-10 w-full border-r rounded-none" />
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-10 w-full border-r rounded-none border-gray-300"
          />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="grid border-b text-sm"
        style={{ gridTemplateColumns: `200px repeat(14, 75px)` }}
      >
        <Skeleton className="h-12 w-full border-r rounded-none" />
        <div className="col-span-14 flex items-center px-2">
          <Skeleton className="h-7 w-40 rounded-md" />
        </div>
      </div>
      ))}
    </div>
  </div>
)

export default TechniciansList
