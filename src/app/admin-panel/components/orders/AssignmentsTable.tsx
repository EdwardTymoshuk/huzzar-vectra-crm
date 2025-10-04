'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { statusColorMap, statusMap, timeSlotMap } from '@/lib/constants'
import { TechnicianAssignment } from '@/types'
import { trpc } from '@/utils/trpc'
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from '@hello-pangea/dnd'
import { useState } from 'react'
import DatePicker from '../../../components/shared/DatePicker'
import OrderDetailsSheet from '../../../components/shared/orders/OrderDetailsSheet'

/**
 * AssignmentsTable component:
 * - Displays assigned orders grouped by technician and time slots.
 * - Supports drag & drop for reassigning orders between technicians.
 */
const AssignmentsTable = () => {
  // Local state to manage selected date
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Local state for order details panel
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Utility object for invalidating queries after mutation
  const utils = trpc.useUtils()

  // Mutation for assigning a new technician to an order
  const updateTechnicianMutation = trpc.order.assignTechnician.useMutation()

  // Helper function to format the selected date for the API (YYYY-MM-DD)
  function formatDate(date?: Date): string | undefined {
    if (!date) return undefined
    return date.toLocaleDateString('en-CA')
  }

  // Fetch assigned orders from server using tRPC
  const {
    data: assignments = [],
    isLoading,
    isError,
  } = trpc.order.getAssignedOrders.useQuery({
    date: formatDate(selectedDate),
  })

  /**
   * onDragEnd:
   * - Called after a drag-and-drop event finishes.
   * - If an order moves between technicians, we update the database.
   */
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { source, destination, draggableId } = result

    // If we actually moved to a different droppable, reassign in the DB
    if (source.droppableId !== destination.droppableId) {
      const newTechnicianId =
        destination.droppableId === 'Nieprzypisany'
          ? null
          : destination.droppableId

      if (
        newTechnicianId &&
        !assignments.some((t) => t.technicianId === newTechnicianId)
      ) {
        console.error('Error: Technician with this ID does not exist.')
        return
      }

      try {
        await updateTechnicianMutation.mutateAsync({
          id: draggableId,
          assignedToId: newTechnicianId ?? undefined,
        })
        // After mutation, invalidate the query to refresh the data
        utils.order.getAssignedOrders.invalidate()
      } catch (error) {
        console.error('Error while assigning technician:', error)
      }
    }
  }

  // Filter out the 'Nieprzypisany' row by ignoring technicianId === null
  const filteredAssignments = assignments.filter(
    (tech) => tech.technicianId !== null
  )

  return (
    <div className="space-y-6">
      {/* Date selection */}
      <div className="flex justify-end">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date ?? undefined)}
          range="day"
          allowFuture
        />
      </div>

      {/* Drag & Drop Context */}
      <DragDropContext onDragEnd={onDragEnd}>
        {isLoading ? (
          <div className="w-full flex justify-center">
            <LoaderSpinner />
          </div>
        ) : isError ? (
          <p className="text-center text-danger">Błąd ładowania danych.</p>
        ) : filteredAssignments.length > 0 ? (
          filteredAssignments.map((technician: TechnicianAssignment) => (
            <div
              key={technician.technicianId}
              className="bg-background p-4 rounded-lg"
            >
              <h2 className="text-lg text-primary font-semibold text-center">
                {technician.technicianName}
              </h2>

              {/* Droppable for each technician */}
              <Droppable droppableId={technician.technicianId!} type="ORDER">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <Table className="border rounded-lg mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center w-1/3">
                            Slot czasowy
                          </TableHead>
                          <TableHead className="text-center w-2/3">
                            Zlecenie & Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {technician.slots.length > 0 ? (
                          technician.slots.map((slot) => (
                            <TableRow key={slot.timeSlot}>
                              {/* Time Slot */}
                              <TableCell className="text-center font-semibold w-1/3">
                                {timeSlotMap[slot.timeSlot] ?? slot.timeSlot}
                              </TableCell>
                              {/* Orders */}
                              <TableCell className="w-2/3">
                                {slot.orders.length > 0 ? (
                                  <div className="min-h-[50px]">
                                    {slot.orders.map((order, index) => (
                                      <Draggable
                                        key={order.id}
                                        draggableId={order.id}
                                        index={index}
                                      >
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="p-2 bg-gray-100 rounded-md text-sm cursor-pointer hover:bg-gray-200 my-1 flex justify-between items-center"
                                            onClick={() => {
                                              setSelectedOrderId(order.id)
                                              setIsPanelOpen(true)
                                            }}
                                          >
                                            <div>
                                              <strong>
                                                {order.orderNumber}
                                              </strong>
                                              <br />
                                              {order.address}
                                            </div>
                                            <span
                                              className={`px-2 py-1 rounded text-xs ${
                                                statusColorMap[order.status]
                                              }`}
                                            >
                                              {statusMap[order.status] ||
                                                'Unknown'}
                                            </span>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-gray-500">
                                    Brak zleceń
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-center text-gray-500"
                            >
                              Brak zleceń
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">
            Brak techników lub przypisanych zleceń na ten dzień.
          </p>
        )}
      </DragDropContext>

      {/* Order details side panel */}
      <OrderDetailsSheet
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

export default AssignmentsTable
