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
  const [rowOrder, setRowOrder] = useState<string[]>([])
  const [anchorOrder, setAnchorOrder] = useState<string[]>([])
  const ROW_ORDER_STORAGE_KEY = 'opl-planner-row-order-v2'
  const ANCHOR_ORDER_STORAGE_KEY = 'opl-planner-anchor-order-v1'

  const trpcUtils = trpc.useUtils()
  const { data: teams = [] } = trpc.opl.user.getTeams.useQuery({ activeOnly: true })
  const groupedAssignments = useMemo(
    () => groupAssignmentsForTeams(assignments, teams),
    [assignments, teams]
  )
  const baseRows = useMemo(
    () =>
      groupedAssignments
        .filter((row) => row.rowId)
        .map((row) => ({
          rowId: row.rowId as string,
          technicianId: row.technicianId ?? null,
        })),
    [groupedAssignments]
  )
  const baseRowIds = useMemo(() => baseRows.map((r) => r.rowId), [baseRows])
  const baseAnchors = useMemo(
    () =>
      Array.from(
        new Set(
          baseRows
            .map((r) => r.technicianId)
            .filter((id): id is string => Boolean(id))
        )
      ),
    [baseRows]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const rawRows = window.localStorage.getItem(ROW_ORDER_STORAGE_KEY)
    const rawAnchors = window.localStorage.getItem(ANCHOR_ORDER_STORAGE_KEY)

    if (!rawRows && !rawAnchors) {
      setRowOrder(baseRowIds)
      setAnchorOrder(baseAnchors)
      return
    }

    try {
      const parsedRows = rawRows ? JSON.parse(rawRows) : []
      const parsedAnchors = rawAnchors ? JSON.parse(rawAnchors) : []

      const persistedRows = Array.isArray(parsedRows)
        ? parsedRows.filter((id): id is string => typeof id === 'string')
        : []
      const persistedAnchors = Array.isArray(parsedAnchors)
        ? parsedAnchors.filter((id): id is string => typeof id === 'string')
        : []

      const knownAnchors = persistedAnchors.filter((id) =>
        baseAnchors.includes(id)
      )
      const missingAnchors = baseAnchors.filter((id) => !knownAnchors.includes(id))
      setAnchorOrder([...knownAnchors, ...missingAnchors])

      const knownRows = persistedRows.filter((id) => baseRowIds.includes(id))
      const combinedKnown = Array.from(new Set([...knownRows])).filter(
        (id) => baseRowIds.includes(id)
      )
      const missing = baseRowIds.filter((id) => !combinedKnown.includes(id))
      setRowOrder([...combinedKnown, ...missing])
    } catch {
      setRowOrder(baseRowIds)
      setAnchorOrder(baseAnchors)
    }
  }, [baseRowIds, baseAnchors])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (rowOrder.length === 0) return
    window.localStorage.setItem(ROW_ORDER_STORAGE_KEY, JSON.stringify(rowOrder))
  }, [rowOrder])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (anchorOrder.length === 0) return
    window.localStorage.setItem(
      ANCHOR_ORDER_STORAGE_KEY,
      JSON.stringify(anchorOrder)
    )
  }, [anchorOrder])

  const orderedAssignments = useMemo(() => {
    const rowIndexMap = new Map(rowOrder.map((id, idx) => [id, idx]))
    const anchorIndexMap = new Map(anchorOrder.map((id, idx) => [id, idx]))
    const fallbackBase = Math.max(rowOrder.length, anchorOrder.length) + 100

    const rankForRow = (row: OplTechnicianAssignment) => {
      const rowRank = row.rowId ? rowIndexMap.get(row.rowId) : undefined
      const anchorRank = row.technicianId
        ? anchorIndexMap.get(row.technicianId)
        : undefined

      if (typeof rowRank === 'number' && typeof anchorRank === 'number') {
        return Math.min(rowRank, anchorRank)
      }
      if (typeof rowRank === 'number') return rowRank
      if (typeof anchorRank === 'number') return anchorRank
      return fallbackBase
    }

    return [...groupedAssignments].sort((a, b) => {
      const diff = rankForRow(a) - rankForRow(b)
      if (diff !== 0) return diff
      return a.technicianName.localeCompare(b.technicianName, 'pl')
    })
  }, [groupedAssignments, rowOrder, anchorOrder])

  const reorderRows = (sourceRowId: string, targetRowId: string) => {
    if (sourceRowId === targetRowId) return
    setRowOrder((prev) => {
      const current = prev.length > 0 ? [...prev] : [...baseRowIds]
      const sourceIndex = current.indexOf(sourceRowId)
      const targetIndex = current.indexOf(targetRowId)
      if (sourceIndex === -1 || targetIndex === -1) return current
      const [moved] = current.splice(sourceIndex, 1)
      current.splice(targetIndex, 0, moved)
      return current
    })

    const sourceTechId =
      baseRows.find((r) => r.rowId === sourceRowId)?.technicianId ?? null
    const targetTechId =
      baseRows.find((r) => r.rowId === targetRowId)?.technicianId ?? null
    if (!sourceTechId || !targetTechId || sourceTechId === targetTechId) return

    setAnchorOrder((prev) => {
      const current = prev.length > 0 ? [...prev] : [...baseAnchors]
      const sourceIndex = current.indexOf(sourceTechId)
      const targetIndex = current.indexOf(targetTechId)
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
          onReorderTechnicians={reorderRows}
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
