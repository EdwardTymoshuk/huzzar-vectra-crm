'use client'

import LoadingOverlay from '@/app/components/shared/LoadingOverlay'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import { TechnicianAssignment } from '@/types'
import { trpc } from '@/utils/trpc'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { TimeSlot } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import OrdersList from './OrdersList'
import TechniciansList from './TechniciansList'

/**
 * PlanningPage:
 * - Single DragDropContext (move between unassigned/assigned/techs).
 * - Shows a global loading overlay while assigning/unassigning.
 * - Now resilient to server errors (spinner always stops, error toast shown).
 */
const PlanningBoard = () => {
  const trpcUtils = trpc.useUtils()

  const [isProcessing, setProcessing] = useState(false)

  const getErrMessage = (err: unknown) => {
    if (typeof err === 'string') return err
    if (err && typeof err === 'object') {
      // @ts-expect-error tRPC client error shape: err.message is fine for users
      if (err.message) return String(err.message)
    }
    return 'Nie udało się zapisać zmian.'
  }

  // Assign/unassign mutation with optimistic update + hard error guard
  const assignOrderMutation = trpc.order.assignTechnician.useMutation({
    onMutate: async (variables: {
      id: string
      assignedToId?: string
      orderDetails?: {
        orderNumber: string
        city: string
        street: string
        timeSlot: TimeSlot
      }
    }) => {
      await trpcUtils.order.getUnassignedOrders.cancel()
      await trpcUtils.order.getAssignedOrders.cancel()

      const previousUnassigned = trpcUtils.order.getUnassignedOrders.getData()
      const previousAssigned = trpcUtils.order.getAssignedOrders.getData()

      // Remove from unassigned (optimistic) when assigning
      if (variables.assignedToId) {
        trpcUtils.order.getUnassignedOrders.setData(undefined, (old) =>
          old ? old.filter((o) => o.id !== variables.id) : old
        )
      }
      // Add back to unassigned on optimistic unassign (optional)
      if (!variables.assignedToId && variables.orderDetails) {
        trpcUtils.order.getUnassignedOrders.setData(
          undefined,
          (old) => old ?? []
        )
      }

      // Optimistic push to the tech board (best-effort)
      if (variables.assignedToId) {
        trpcUtils.order.getAssignedOrders.setData(undefined, (old) => {
          if (!old) return old
          const newOrder = {
            id: variables.id,
            orderNumber: variables.orderDetails?.orderNumber || 'N/A',
            address: `${variables.orderDetails?.city || 'City'}, ${
              variables.orderDetails?.street || 'Street'
            }`,
            status: 'ASSIGNED' as const,
            assignedToId: variables.assignedToId,
          }
          const technicianId = variables.assignedToId
          const idx = old.findIndex((a) => a.technicianId === technicianId)

          if (idx !== -1) {
            const copy = [...old]
            const assignment = { ...copy[idx] }
            const timeSlot = variables.orderDetails?.timeSlot || 'EIGHT_TEN'
            const sIdx = assignment.slots.findIndex(
              (s) => s.timeSlot === timeSlot
            )
            if (sIdx !== -1) {
              assignment.slots[sIdx] = {
                ...assignment.slots[sIdx],
                orders: [...assignment.slots[sIdx].orders, newOrder],
              }
            } else {
              assignment.slots.push({ timeSlot, orders: [newOrder] })
            }
            copy[idx] = assignment
            return copy
          }

          const newAssignment: TechnicianAssignment = {
            technicianName: 'Technician',
            technicianId: technicianId ?? null,
            slots: [
              {
                timeSlot: variables.orderDetails?.timeSlot || 'EIGHT_TEN',
                orders: [newOrder],
              },
            ],
          }
          return [...old, newAssignment]
        })
      }

      return { previousUnassigned, previousAssigned }
    },
    onError: (err, _variables, ctx) => {
      // rollback caches
      if (ctx) {
        trpcUtils.order.getUnassignedOrders.setData(
          undefined,
          () => ctx.previousUnassigned
        )
        trpcUtils.order.getAssignedOrders.setData(
          undefined,
          () => ctx.previousAssigned
        )
      }
      // stop spinner + show error
      setProcessing(false)
      toast.error(getErrMessage(err))
    },
    onSettled: async () => {
      // whatever happened, refresh and stop loader
      await Promise.all([
        trpcUtils.order.getUnassignedOrders.invalidate(),
        trpcUtils.order.getAssignedOrders.invalidate(),
      ])
      setProcessing(false)
    },
  })

  const handleOrderDrop = async (orderId: string, technicianId: string) => {
    // make extra sure we always stop the loader even if mutateAsync throws
    try {
      await assignOrderMutation.mutateAsync({
        id: orderId,
        assignedToId:
          technicianId === 'UNASSIGNED_ORDERS' ? undefined : technicianId,
      })
    } catch {
      // onError already toasts; we still guard here
      setProcessing(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    setProcessing(true)
    try {
      const { draggableId, destination } = result
      if (!destination.droppableId) return
      await handleOrderDrop(draggableId, destination.droppableId)
    } catch {
      // guard path (shouldn’t happen since onError handles it)
      toast.error('Nie udało się przypisać zlecenia.')
      setProcessing(false)
    }
  }

  return (
    <MaxWidthWrapper>
      <LoadingOverlay show={isProcessing} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Pass setProcessing so child actions can toggle the global overlay */}
          <TechniciansList setProcessing={setProcessing} />
          <OrdersList />
        </div>
      </DragDropContext>
    </MaxWidthWrapper>
  )
}

export default PlanningBoard
