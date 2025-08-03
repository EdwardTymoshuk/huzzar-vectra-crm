'use client'

import LoadingOverlay from '@/app/components/shared/LoadingOverlay'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { TechnicianAssignment } from '@/types'
import { trpc } from '@/utils/trpc'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { TimeSlot } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import OrdersList from '../../components/planning/OrdersList'
import TechniciansList from '../../components/planning/TechniciansList'

/**
 * PlanningPage:
 * - Uses one DragDropContext so items can move between unassigned and assigned
 *   and also between different technicians.
 */
const PlanningPage = () => {
  const router = useRouter()
  const trpcUtils = trpc.useUtils()

  const [isProcessing, setProcessing] = useState(false)

  // Mutation to assign/unassign an order
  const assignOrderMutation = trpc.order.assignTechnician.useMutation({
    /**
     * Optimistic update: executed before the mutation is sent.
     * Cancels ongoing queries, snapshots previous data, and updates the cache immediately.
     * We assume that additional order details are provided in variables.orderDetails.
     */
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
      // Cancel any outgoing refetches for these queries
      await trpcUtils.order.getUnassignedOrders.cancel()
      await trpcUtils.order.getAssignedOrders.cancel()

      // Snapshot the previous cache data
      const previousUnassigned = trpcUtils.order.getUnassignedOrders.getData()
      const previousAssigned = trpcUtils.order.getAssignedOrders.getData()

      // Optimistically update the unassigned orders cache:
      // Remove the order from the unassigned list if we are assigning it to a technician.
      if (variables.assignedToId) {
        trpcUtils.order.getUnassignedOrders.setData(undefined, (old) =>
          old ? old.filter((order) => order.id !== variables.id) : old
        )
      } else {
        // If unassigning, implement similar logic to add it back.
      }

      // Optimistically update the assigned orders cache:
      if (variables.assignedToId) {
        trpcUtils.order.getAssignedOrders.setData(undefined, (old) => {
          if (!old) return old
          // Define the new order object matching the internal order structure
          const newOrder = {
            id: variables.id,
            orderNumber: variables.orderDetails?.orderNumber || 'N/A',
            // Construct the address from available details
            address: `${variables.orderDetails?.city || 'City'}, ${
              variables.orderDetails?.street || 'Street'
            }`,
            status: 'ASSIGNED', // assuming status is a string here
            assignedToId: variables.assignedToId,
          }

          // Find the assignment for the technician
          const technicianId = variables.assignedToId
          const assignmentIndex = old.findIndex(
            (assignment) => assignment.technicianId === technicianId
          )

          if (assignmentIndex !== -1) {
            // Technician assignment exists; update the appropriate slot.
            const assignment = { ...old[assignmentIndex] }
            const timeSlot = variables.orderDetails?.timeSlot || 'EIGHT_TEN'

            // Find if a slot with the given timeSlot exists.
            const slotIndex = assignment.slots.findIndex(
              (slot) => slot.timeSlot === timeSlot
            )

            if (slotIndex !== -1) {
              // If found, append the new order to that slot.
              const updatedSlot = {
                ...assignment.slots[slotIndex],
                orders: [...assignment.slots[slotIndex].orders, newOrder],
              }
              assignment.slots[slotIndex] = updatedSlot
            } else {
              // Otherwise, create a new slot for this timeSlot.
              assignment.slots.push({
                timeSlot,
                orders: [newOrder],
              })
            }
            // Replace the updated assignment in the array.
            const newAssignments = [...old]
            newAssignments[assignmentIndex] = assignment
            return newAssignments
          } else {
            // If no assignment for the technician exists, create one.
            const newAssignment: TechnicianAssignment = {
              technicianName: 'Technician Name', // TODO: Replace with actual technician name if available.
              technicianId: technicianId ?? null,
              slots: [
                {
                  timeSlot: variables.orderDetails?.timeSlot || 'EIGHT_TEN',
                  orders: [newOrder],
                },
              ],
            }
            return [...old, newAssignment]
          }
        })
      }

      // Return previous cache data for potential rollback in onError
      return { previousUnassigned, previousAssigned }
    },
    /**
     * If the mutation fails, rollback the cache to the previous state.
     */
    onError: (err, variables, context) => {
      if (context) {
        trpcUtils.order.getUnassignedOrders.setData(
          undefined,
          () => context.previousUnassigned
        )
        trpcUtils.order.getAssignedOrders.setData(
          undefined,
          () => context.previousAssigned
        )
      }
    },
    /**
     * After mutation either succeeds or fails, invalidate queries to refetch fresh data.
     */
    onSettled: async () => {
      await Promise.all([
        trpcUtils.order.getUnassignedOrders.invalidate(),
        trpcUtils.order.getAssignedOrders.invalidate(),
      ])

      setProcessing(false)
    },
  })

  const handleOrderDrop = async (orderId: string, technicianId: string) => {
    await assignOrderMutation.mutateAsync({
      id: orderId,
      assignedToId:
        technicianId === 'UNASSIGNED_ORDERS' ? undefined : technicianId,
    })
  }

  /**
   * Called when an item is dropped anywhere in the DragDropContext.
   */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    setProcessing(true)

    const { draggableId, destination } = result
    if (!destination.droppableId) return

    // Call the function for assigning/unassigning orders
    await handleOrderDrop(draggableId, destination.droppableId)
  }
  return (
    <MaxWidthWrapper>
      <PageHeader title="Planowanie zleceń" />
      <Button
        className="justify-start w-fit"
        variant="ghost"
        onClick={() => router.back()}
      >
        <MdKeyboardArrowLeft />
        Powrót
      </Button>
      <LoadingOverlay show={isProcessing} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <TechniciansList setProcessing={setProcessing}/>
          <OrdersList />
        </div>
      </DragDropContext>
    </MaxWidthWrapper>
  )
}

export default PlanningPage
