'use client'

import LoadingOverlay from '@/app/components/LoadingOverlay'
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
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: '#26303d',
  COMPLETED: '#66b266',
  NOT_COMPLETED: '#E6262D',
}

const PlanningBoard = () => {
  const { selectedDate } = usePlanningContext()
  const utils = trpc.useUtils()
  const [isProcessing, setProcessing] = useState(false)
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
        date?: string
        operator: string
        status: string
        techniciansLabel: string
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
            date: o.date ? new Date(o.date).toLocaleDateString('pl-PL') : undefined,
            operator: o.operator ?? '—',
            status: o.status,
            techniciansLabel:
              o.assignedTechnicians && o.assignedTechnicians.length > 0
                ? o.assignedTechnicians.map((t) => t.name).join(' / ')
                : tech.technicianName,
            completedByName: o.completedByName ?? null,
          })
        })
      })
    })

    const assignedMarkers = Array.from(byOrderId.values()).map((o) => ({
      id: o.id,
      lat: o.lat,
      lng: o.lng,
      label: `${o.orderNumber} • ${o.address}${
        o.techniciansLabel
          ? `<br />Technik: ${o.techniciansLabel}`
          : ''
      }${
        o.completedByName &&
        (o.status === 'COMPLETED' || o.status === 'NOT_COMPLETED')
          ? `<br />Wykonał: ${o.completedByName}`
          : ''
      }`,
      date: o.date,
      operator: o.operator,
      color: STATUS_COLORS[o.status] ?? '#26303d',
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
        label: `${o.orderNumber} • ${o.city}, ${o.street}<br />
        Status: nieprzypisane`,
        date: o.date ? new Date(o.date).toLocaleDateString('pl-PL') : undefined,
        operator: o.operator ?? '—',
        color: '#E6262D',
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
      const techId =
        destination.droppableId === 'UNASSIGNED_ORDERS'
          ? undefined
          : destination.droppableId
      await assignMutation.mutateAsync({
        id: draggableId,
        technicianId: techId,
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
        <div className="flex flex-col md:flex-row flex-[7] h-[70%] min-h-[70%] overflow-hidden gap-4 w-full">
          {/* Schedule (left panel) */}
          <section className="flex flex-col flex-shrink-0 md:max-w-[70%] w-full md:w-auto overflow-hidden">
            <div className="flex-1 overflow-y-auto px-2">
              <TechniciansList
                setProcessing={setProcessing}
                assignments={assigned}
                isLoading={isAssignedLoading}
              />
            </div>
          </section>

          {/* Map (right panel, fills remaining space) */}
          <section className="flex flex-1 overflow-hidden">
            <div className="flex-1 relative overflow-hidden rounded-lg border">
              <MapView
                mapKey={`planning-map-${selectedDateKey}-${markers.length}`}
                markers={markers}
              />
            </div>
          </section>
        </div>

        {/* 🔹 Bottom section: unassigned orders */}
        <section className="flex flex-col flex-[3] h-[30%] min-h-[30%] overflow-hidden">
          <div className="flex-1 max-h-full overflow-y-auto pb-2">
            <OrdersList
              orders={unassigned}
              isLoading={isUnassignedLoading}
            />
          </div>
        </section>
      </DragDropContext>
    </div>
  )
}

export default PlanningBoard
