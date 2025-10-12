'use client'

import LoadingOverlay from '@/app/components/shared/LoadingOverlay'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import { trpc } from '@/utils/trpc'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import OrdersList from './OrdersList'
import TechniciansList from './TechniciansList'

/**
 * PlanningBoard:
 * - Left: compact 2x2 card list of unassigned orders
 * - Right: technician timeline grid (hour slots)
 * - Bottom: shared map with markers
 */
const MapView = dynamic(() => import('../../components/planning/MapView'), {
  ssr: false,
})

const PlanningBoard = () => {
  const utils = trpc.useUtils()
  const [isProcessing, setProcessing] = useState(false)

  const {
    data: unassigned = [],
    isLoading: isUnassignedLoading,
    error: unassignedError,
  } = trpc.order.getUnassignedOrders.useQuery(undefined, { staleTime: 60_000 })

  const markers = useMemo(
    () =>
      unassigned
        .filter(
          (r) =>
            typeof r.lat === 'number' &&
            typeof r.lng === 'number' &&
            !Number.isNaN(r.lat) &&
            !Number.isNaN(r.lng)
        )
        .map((r) => ({
          id: r.id,
          lat: r.lat!,
          lng: r.lng!,
          label: `${r.orderNumber} • ${r.city}, ${r.street}`,
        })),
    [unassigned]
  )

  const assignMutation = trpc.order.assignTechnician.useMutation({
    onError: (err) => toast.error(err.message || 'Nie udało się przypisać.'),
    onSettled: async () => {
      await Promise.all([
        utils.order.getUnassignedOrders.invalidate(),
        utils.order.getAssignedOrders.invalidate(),
      ])
      setProcessing(false)
    },
  })

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
    <MaxWidthWrapper>
      <LoadingOverlay show={isProcessing} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(340px,0.9fr)_2.1fr] gap-6 mt-4">
          {/* Left: compact unassigned orders */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-center">
              Zlecenia do realizacji (nieprzypisane)
            </h2>
            <OrdersList compact />
          </section>

          {/* Right: technicians timeline */}
          <section className="space-y-3 min-w-0">
            <h2 className="text-lg font-semibold text-center">
              Harmonogram techników
            </h2>
            <TechniciansList setProcessing={setProcessing} />
          </section>
        </div>
      </DragDropContext>

      {/* Map at the bottom */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-center mb-2">Mapa</h2>
        <div className="rounded-xl border overflow-hidden">
          <MapView
            mapKey={`planning-map-${markers.length}`}
            markers={markers}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {isUnassignedLoading
            ? 'Ładowanie adresów…'
            : unassignedError
            ? 'Błąd ładowania adresów'
            : `Zlecenia: ${unassigned.length} • Z geolokacją: ${markers.length}`}
        </p>
      </section>
    </MaxWidthWrapper>
  )
}

export default PlanningBoard
