'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
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
import { formatDateForInput } from '@/utils/dates/formatDateTime'
import { trpc } from '@/utils/trpc'
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from '@hello-pangea/dnd'
import { addDays, subDays } from 'date-fns'
import { useState } from 'react'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import DatePicker from '../../../components/shared/DatePicker'
import OrderDetailsSheet from '../../../components/shared/orders/OrderDetailsSheet'

/**
 * AssignmentsTable
 * Displays daily technician assignments in Excel-like tables
 * with clear headers and technician sections.
 */
const AssignmentsTable = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const utils = trpc.useUtils()
  const updateTechnicianMutation = trpc.order.assignTechnician.useMutation()

  const {
    data: assignments = [],
    isLoading,
    isError,
  } = trpc.order.getAssignedOrders.useQuery({
    date: formatDateForInput(selectedDate),
  })

  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1))
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1))

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { source, destination, draggableId } = result
    if (source.droppableId === destination.droppableId) return

    const newTechnicianId =
      destination.droppableId === 'Nieprzypisany'
        ? null
        : destination.droppableId

    try {
      await updateTechnicianMutation.mutateAsync({
        id: draggableId,
        assignedToId: newTechnicianId ?? undefined,
      })
      utils.order.getAssignedOrders.invalidate()
    } catch (error) {
      console.error('Error while assigning technician:', error)
    }
  }

  const filteredAssignments = assignments.filter((t) => t.technicianId !== null)

  return (
    <div className="space-y-8">
      {/* --- Date navigation --- */}
      <div className="flex items-center justify-center gap-8 mt-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevDay}
          aria-label="Previous day"
        >
          <MdChevronLeft className="w-5 h-5" />
        </Button>

        <div className="scale-110">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            range="day"
            allowFuture
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextDay}
          aria-label="Next day"
        >
          <MdChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* --- Technician sections --- */}
      <DragDropContext onDragEnd={onDragEnd}>
        {isLoading ? (
          <div className="w-full flex justify-center py-10">
            <LoaderSpinner />
          </div>
        ) : isError ? (
          <p className="text-center text-danger">Błąd ładowania danych.</p>
        ) : filteredAssignments.length > 0 ? (
          filteredAssignments.map((technician: TechnicianAssignment) => (
            <div key={technician.technicianId}>
              {/* Technician name header */}
              <div className="bg-background py-2 border-b text-center font-bold text-lg">
                {technician.technicianName}
              </div>

              {/* Table section */}
              <Droppable droppableId={technician.technicianId!} type="ORDER">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <Table className="">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            DATA UMÓWIENIA
                          </TableHead>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            SLOT UMÓWIENIA
                          </TableHead>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            NR ZLECENIA
                          </TableHead>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            ADRES
                          </TableHead>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            OPERATOR
                          </TableHead>
                          <TableHead className="bg-secondary text-white text-center border text-sm font-semibold">
                            STATUS
                          </TableHead>
                          <TableHead className="bg-primary text-white text-center border text-sm font-semibold">
                            UWAGI
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {technician.slots.flatMap((slot) =>
                          slot.orders.length > 0
                            ? slot.orders.map((order, index) => (
                                <Draggable
                                  key={order.id}
                                  draggableId={order.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <TableRow
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="hover:bg-muted cursor-pointer text-sm"
                                      onClick={() => {
                                        setSelectedOrderId(order.id)
                                        setIsPanelOpen(true)
                                      }}
                                    >
                                      <TableCell className="text-center border">
                                        {selectedDate.toLocaleDateString(
                                          'pl-PL'
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center border">
                                        {timeSlotMap[slot.timeSlot] ??
                                          slot.timeSlot}
                                      </TableCell>
                                      <TableCell className="text-center border font-medium">
                                        {order.orderNumber}
                                      </TableCell>
                                      <TableCell className="text-center border">
                                        {order.address}
                                      </TableCell>
                                      <TableCell className="text-center border">
                                        {order.operator ?? '-'}
                                      </TableCell>
                                      <TableCell
                                        className={`text-center border font-medium ${
                                          statusColorMap[order.status]
                                        }`}
                                      >
                                        {statusMap[order.status]}
                                      </TableCell>
                                      <TableCell className="text-center border text-muted-foreground">
                                        {/* Placeholder for comments */}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Draggable>
                              ))
                            : [
                                <TableRow key={slot.timeSlot}>
                                  <TableCell
                                    colSpan={7}
                                    className="text-center text-gray-400 border"
                                  >
                                    Brak zleceń
                                  </TableCell>
                                </TableRow>,
                              ]
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
          <p className="text-center text-muted-foreground py-10">
            Brak techników lub przypisanych zleceń na ten dzień.
          </p>
        )}
      </DragDropContext>

      {/* Order detail side sheet */}
      <OrderDetailsSheet
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

export default AssignmentsTable
