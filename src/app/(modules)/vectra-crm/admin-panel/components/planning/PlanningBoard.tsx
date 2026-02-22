'use client'

import LoadingOverlay from '@/app/components/LoadingOverlay'
import { trpc } from '@/utils/trpc'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
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
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: '#26303d',
  COMPLETED: '#66b266',
  NOT_COMPLETED: '#E6262D',
}

const PlanningBoard = () => {
  const { selectedDate } = usePlanningContext()
  const utils = trpc.useUtils()
  const [isProcessing, setProcessing] = useState(false)

  /** 🔹 Fetch data for both assigned & unassigned orders */
  const { data: assigned = [], isLoading: isAssignedLoading } =
    trpc.vectra.order.getAssignedOrders.useQuery(
      { date: selectedDate.toISOString().split('T')[0] },
      { keepPreviousData: true }
    )

  const { data: unassigned = [], isLoading: isUnassignedLoading } =
    trpc.vectra.order.getUnassignedOrders.useQuery({
      date: selectedDate.toISOString().split('T')[0],
    })

  const isLoading = isAssignedLoading || isUnassignedLoading

  /** Combine assigned & unassigned into single marker list */
  const markers = useMemo(() => {
    const assignedMarkers =
      assigned.flatMap((tech) =>
        tech.slots.flatMap((slot) =>
          slot.orders
            .filter(
              (o) =>
                typeof o.lat === 'number' &&
                typeof o.lng === 'number' &&
                !Number.isNaN(o.lat) &&
                !Number.isNaN(o.lng)
            )
            .map((o) => ({
              id: o.id,
              lat: o.lat!,
              lng: o.lng!,
              label: `${o.orderNumber} • ${o.address}${
                tech.technicianName
                  ? `<br />
                Technik: ${tech.technicianName}`
                  : ''
              }`,
              date: o.date
                ? new Date(o.date).toLocaleDateString('pl-PL')
                : undefined,
              operator: o.operator ?? '—',
              color: STATUS_COLORS[o.status] ?? '#26303d',
            }))
        )
      ) ?? []

    const unassignedMarkers = unassigned
      .filter((o) => o.lat && o.lng)
      .map((o) => ({
        id: o.id,
        lat: o.lat!,
        lng: o.lng!,
        label: `${o.orderNumber} • ${o.city}, ${o.street}<br />
        Status: nieprzypisane`,
        date: o.date ? new Date(o.date).toLocaleDateString('pl-PL') : undefined,
        operator: o.operator ?? '—',
        color: '#E6262D',
      }))

    return [...assignedMarkers, ...unassignedMarkers]
  }, [assigned, unassigned])

  /** Mutation for assignment */
  const assignMutation = trpc.vectra.order.assignTechnician.useMutation({
    onError: (err) => toast.error(err.message || 'Nie udało się przypisać.'),
    onSettled: async () => {
      await Promise.all([
        utils.vectra.order.getAssignedOrders.invalidate(),
        utils.vectra.order.getUnassignedOrders.invalidate(),
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
      const techId =
        destination.droppableId === 'UNASSIGNED_ORDERS'
          ? undefined
          : destination.droppableId
      await assignMutation.mutateAsync({
        id: draggableId,
        assignedToId: techId,
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
          <section className="flex flex-col flex-1 min-h-0 min-w-0 flex-shrink-0 w-full md:flex-none md:max-w-[70%] md:w-auto overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-2">
              <TechniciansList setProcessing={setProcessing} />
            </div>
          </section>

          {/* Map (desktop only; mobile focuses on timeline/list usability) */}
          <section className="hidden md:flex md:flex-1 overflow-hidden">
            <div className="flex-1 relative overflow-hidden rounded-lg border">
              <MapView
                mapKey={`planning-map-${selectedDate.toISOString()}-${
                  markers.length
                }`}
                markers={markers}
              />
            </div>
          </section>
        </div>

        {/* 🔹 Bottom section: unassigned orders */}
        <section className="flex flex-col flex-[3] min-h-0 md:h-[30%] md:min-h-[30%] overflow-hidden">
          <div className="flex-1 min-h-0 max-h-full overflow-y-auto pb-2">
            <OrdersList />
          </div>
        </section>
      </DragDropContext>
    </div>
  )
}

export default PlanningBoard
