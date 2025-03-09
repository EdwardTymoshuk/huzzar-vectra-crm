'use client'

import DatePicker from '@/app/components/DatePicker'
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
import OrderDetailsPanel from './OrderDetailsPanel'

/**
 * AssignmentsTable component:
 * - Displays assigned orders grouped by technician and time slots.
 * - Supports drag & drop for reassigning orders between technicians.
 */
const AssignmentsTable = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const utils = trpc.useUtils()
  const updateTechnicianMutation = trpc.order.assignTechnician.useMutation()

  /**
   * Formats the selected date to match API format (YYYY-MM-DD).
   */
  function formatDate(date?: Date): string | undefined {
    if (!date) return undefined
    return date.toLocaleDateString('en-CA')
  }

  // Fetch assigned orders from API using tRPC
  const {
    data: assignments = [],
    isLoading,
    isError,
  } = trpc.order.getAssignedOrders.useQuery({
    date: formatDate(selectedDate),
  })

  /**
   * Handles the drag-and-drop event.
   * If an order is moved between technicians, it updates the database.
   */
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    console.log(
      `Przeniesiono zlecenie ${draggableId} z ${source.droppableId} do ${destination.droppableId}`
    )

    if (source.droppableId !== destination.droppableId) {
      const newTechnicianId =
        destination.droppableId === 'Nieprzypisany'
          ? null
          : destination.droppableId

      if (
        newTechnicianId &&
        !assignments.some((t) => t.technicianId === newTechnicianId)
      ) {
        console.error('Błąd: Technik o podanym ID nie istnieje')
        return
      }

      try {
        await updateTechnicianMutation.mutateAsync({
          id: draggableId,
          assignedToId: newTechnicianId ?? undefined,
        })

        utils.order.getAssignedOrders.invalidate()
      } catch (error) {
        console.error('Błąd podczas przypisywania technika:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Date selection */}
      <div className="flex justify-end">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date ?? undefined)}
        />
      </div>

      {/* Drag & Drop Context */}
      <DragDropContext onDragEnd={onDragEnd}>
        {isLoading ? (
          <p className="text-center">Ładowanie...</p>
        ) : isError ? (
          <p className="text-center text-danger">Błąd ładowania danych.</p>
        ) : assignments.length > 0 ? (
          assignments.map((technician: TechnicianAssignment) => (
            <div
              key={technician.technicianId || 'Nieprzypisany'}
              className="bg-gray-100 p-4 rounded-lg"
            >
              <h2 className="text-lg text-primary font-semibold text-center">
                {technician.technicianName}
              </h2>

              {/* Droppable for technician */}
              <Droppable
                droppableId={technician.technicianId || 'Nieprzypisany'}
                type="ORDER"
              >
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

                              {/* Orders + Status */}
                              <TableCell className="w-2/3">
                                {slot.orders.length > 0 ? (
                                  <div className="min-h-[50px]">
                                    {slot.orders.map((order) => (
                                      <Draggable
                                        key={order.id}
                                        draggableId={order.id}
                                        index={assignments
                                          .flatMap((a) =>
                                            a.slots.flatMap((s) => s.orders)
                                          )
                                          .findIndex((o) => o.id === order.id)}
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

      {/* Order details panel */}
      <OrderDetailsPanel
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

export default AssignmentsTable
