'use client'

import LoadingOverlay from '@/app/components/LoadingOverlay'
import { oplNetworkMap, oplTimeSlotMap } from '@/app/(modules)/opl-crm/lib/constants'
import { OplTechnicianAssignment } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import OrdersList from './OrdersList'
import { usePlanningContext } from './PlanningContext'
import TechniciansList from './TechniciansList'

/**
 * PlanningBoard
 * --------------------------------------------------
 * - Displays ALL orders for selected day on map:
 * - Handles drag-and-drop assignment.
 */
const MapView = dynamic(() => import('./MapView'), { ssr: false })

/** 🎨 Marker colors based on order status */
const MARKER_COLORS = {
  completed: '#22c55e',
  notCompleted: '#ef4444',
  unassigned: '#26303d',
  assigned: '#f59e0b',
} as const

const PlanningBoard = () => {
  const { selectedDate } = usePlanningContext()
  const utils = trpc.useUtils()
  const [isProcessing, setProcessing] = useState(false)
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null)
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')

  /** 🔹 Fetch data for both assigned & unassigned orders */
  const { data: assigned = [], isLoading: isAssignedLoading } =
    trpc.opl.order.getAssignedOrders.useQuery(
      { date: selectedDateKey },
      { keepPreviousData: true }
    )

  const { data: unassigned = [], isLoading: isUnassignedLoading } =
    trpc.opl.order.getUnassignedOrders.useQuery({
      date: selectedDateKey,
    })

  const isLoading = isAssignedLoading || isUnassignedLoading

  /** Combine assigned & unassigned into single marker list */
  const markers = useMemo(() => {
    const byOrderId = new Map<
      string,
      {
        id: string
        lat: number
        lng: number
        orderNumber: string
        address: string
        dateLabel?: string
        slotLabel: string
        networkLabel: string
        status: string
        techniciansLabel: string
        standard: string
        notes: string | null
        failureReason: string | null
        completedByName: string | null
      }
    >()

    ;(assigned ?? []).forEach((tech: OplTechnicianAssignment) => {
      tech.slots.forEach((slot) => {
        slot.orders.forEach((o) => {
          if (
            typeof o.lat !== 'number' ||
            typeof o.lng !== 'number' ||
            Number.isNaN(o.lat) ||
            Number.isNaN(o.lng)
          ) {
            return
          }

          const existing = byOrderId.get(o.id)
          if (existing) {
            return
          }

          byOrderId.set(o.id, {
            id: o.id,
            lat: o.lat,
            lng: o.lng,
            orderNumber: o.orderNumber,
            address: o.address,
            dateLabel: o.date
              ? new Date(o.date).toLocaleDateString('pl-PL')
              : undefined,
            slotLabel: oplTimeSlotMap[slot.timeSlot] ?? slot.timeSlot,
            networkLabel:
              o.network && o.network in oplNetworkMap
                ? oplNetworkMap[o.network]
                : '-',
            status: o.status,
            techniciansLabel:
              o.assignedTechnicians && o.assignedTechnicians.length > 0
                ? o.assignedTechnicians.map((t) => t.name).join(' / ')
                : tech.technicianName,
            standard: o.standard ?? '-',
            notes: o.notes ?? null,
            failureReason: o.failureReason ?? null,
            completedByName: o.completedByName ?? null,
          })
        })
      })
    })

    const assignedMarkers = Array.from(byOrderId.values()).map((o) => ({
      id: o.id,
      lat: o.lat,
      lng: o.lng,
      orderNumber: o.orderNumber,
      address: o.address,
      dateLabel: o.dateLabel,
      slotLabel: o.slotLabel,
      technicianLabel: o.techniciansLabel || '-',
      standard: o.standard,
      networkLabel: o.networkLabel,
      notes: o.notes,
      failureReason: o.failureReason,
      completedByName: o.completedByName,
      color:
        o.status === 'COMPLETED'
          ? MARKER_COLORS.completed
          : o.status === 'NOT_COMPLETED'
            ? MARKER_COLORS.notCompleted
            : MARKER_COLORS.assigned,
    }))

    const assignedIds = new Set(byOrderId.keys())
    const unassignedMarkers = unassigned
      .filter(
        (o) =>
          typeof o.lat === 'number' &&
          typeof o.lng === 'number' &&
          !Number.isNaN(o.lat) &&
          !Number.isNaN(o.lng) &&
          !assignedIds.has(o.id)
      )
      .map((o) => ({
        id: o.id,
        lat: o.lat as number,
        lng: o.lng as number,
        orderNumber: o.orderNumber,
        address: `${o.city}, ${o.street}`,
        dateLabel: o.date
          ? new Date(o.date).toLocaleDateString('pl-PL')
          : undefined,
        slotLabel: oplTimeSlotMap[o.timeSlot] ?? o.timeSlot,
        technicianLabel: '-',
        standard: o.standard ?? '-',
        networkLabel:
          o.network && o.network in oplNetworkMap ? oplNetworkMap[o.network] : '-',
        notes: o.notes ?? null,
        failureReason: o.failureReason ?? null,
        completedByName: null,
        color: MARKER_COLORS.unassigned,
      }))

    return [...assignedMarkers, ...unassignedMarkers]
  }, [assigned, unassigned])

  /** Mutation for assignment */
  const assignMutation = trpc.opl.order.assignTechnician.useMutation({
    onError: (err) => toast.error(err.message || 'Nie udało się przypisać.'),
    onSettled: async () => {
      await Promise.all([
        utils.opl.order.getAssignedOrders.invalidate(),
        utils.opl.order.getUnassignedOrders.invalidate(),
      ])
      setProcessing(false)
    },
  })

  /** Handle drag-drop assignment */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    setProcessing(true)
    try {
      const { draggableId, destination } = result
      const destinationId = destination.droppableId

      const payload =
        destinationId === 'UNASSIGNED_ORDERS'
          ? { technicianId: undefined as string | undefined, technicianIds: undefined as string[] | undefined }
          : destinationId.startsWith('team:')
            ? {
                technicianId: undefined as string | undefined,
                technicianIds: destinationId
                  .replace('team:', '')
                  .split('|')
                  .filter(Boolean),
              }
            : {
                technicianId: destinationId,
                technicianIds: undefined as string[] | undefined,
              }
      await assignMutation.mutateAsync({
        id: draggableId,
        ...payload,
      })
    } catch {
      setProcessing(false)
    }
  }
  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-hidden p-2">
      <LoadingOverlay show={isProcessing || isLoading} />

      <DragDropContext onDragEnd={handleDragEnd} enableDefaultSensors>
        {/* 🔹 Top section: schedule + map */}
        <div className="flex flex-col md:flex-row flex-[7] min-h-0 md:h-[70%] md:min-h-[70%] overflow-hidden gap-4 w-full">
          {/* Schedule (left panel) */}
          <section className="flex flex-col flex-1 min-h-0 min-w-0 flex-shrink-0 w-full md:flex-none md:w-auto overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-2">
              <TechniciansList
                setProcessing={setProcessing}
                assignments={assigned}
                isLoading={isAssignedLoading}
                onOrderClick={setFocusedOrderId}
              />
            </div>
          </section>

          {/* Map (desktop only; mobile focuses on timeline/list usability) */}
          <section className="hidden md:flex md:flex-1 overflow-hidden">
            <div className="flex-1 relative overflow-hidden rounded-lg border">
              <MapView
                mapKey={`planning-map-${selectedDateKey}-${markers.length}`}
                markers={markers}
                focusOrderId={focusedOrderId}
              />
            </div>
          </section>
        </div>

        {/* 🔹 Bottom section: unassigned orders */}
        <section className="flex flex-col flex-[3] min-h-0 md:h-[30%] md:min-h-[30%] overflow-hidden">
          <div className="flex-1 min-h-0 max-h-full overflow-y-auto pb-2">
            <OrdersList
              orders={unassigned}
              isLoading={isUnassignedLoading}
              onOrderClick={setFocusedOrderId}
            />
          </div>
        </section>
      </DragDropContext>
    </div>
  )
}

export default PlanningBoard
