'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { statusColorMap, statusMap } from '@/lib/constants'
import { TechnicianAssignment } from '@/types/vectra-crm'
import { matchSearch } from '@/utils/searchUtils'
import { trpc } from '@/utils/trpc'
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from '@hello-pangea/dnd'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import OrderDetailsSheet from '../../../components/orders/OrderDetailsSheet'
import { timeSlotMap } from '../../../lib/constants'
import { usePlanningContext } from './PlanningContext'
import UnassignedOrdersAccordion from './UnassignedOrdersAccordion'

/**
 * AssignmentsTable
 * --------------------------------------------------
 * Displays all technician assignments for selected day.
 * - Supports search by technician name, address, and order number.
 */
const AssignmentsTable = () => {
  const { selectedDate, searchTerm } = usePlanningContext()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const [from, setFrom] = useState<Date | undefined>()
  const [to, setTo] = useState<Date | undefined>()

  const { data: unassigned = [], isLoading: isUnassignedLoading } =
    trpc.vectra.order.getAllUnassigned.useQuery({
      dateFrom: from,
      dateTo: to,
    })

  const utils = trpc.useUtils()
  const updateTechnicianMutation =
    trpc.vectra.order.assignTechnician.useMutation()

  const {
    data: assignments = [],
    isLoading,
    isError,
  } = trpc.vectra.order.getAssignedOrders.useQuery({
    date: selectedDate.toLocaleDateString('en-CA'),
  })

  /** 🔹 Handle drag-drop assignment */
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
      utils.vectra.order.getAssignedOrders.invalidate()
    } catch (error) {
      console.error('Error while assigning technician:', error)
    }
  }

  /** 🔍 Filter by technician name, address, or order number */
  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) {
      return assignments.filter((t) => t.technicianId !== null)
    }

    return assignments
      .map((tech) => {
        const matchesTechnician = matchSearch(searchTerm, tech.technicianName)

        const filteredSlots = tech.slots
          .map((slot) => ({
            ...slot,
            orders: slot.orders.filter((o) =>
              matchSearch(searchTerm, o.orderNumber, o.address)
            ),
          }))
          .filter((slot) => slot.orders.length > 0)

        if (matchesTechnician || filteredSlots.length > 0) {
          return {
            ...tech,
            slots: filteredSlots.length > 0 ? filteredSlots : tech.slots,
          }
        }

        return null
      })
      .filter(Boolean) as TechnicianAssignment[]
  }, [assignments, searchTerm])

  return (
    <div className="space-y-6">
      <UnassignedOrdersAccordion
        data={unassigned}
        loading={isUnassignedLoading}
        from={from}
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        onOpenOrder={(id) => {
          setSelectedOrderId(id)
          setIsPanelOpen(true)
        }}
      />

      <DragDropContext onDragEnd={onDragEnd} enableDefaultSensors>
        {isLoading ? (
          <div className="w-full flex justify-center py-10">
            <LoaderSpinner />
          </div>
        ) : isError ? (
          <p className="text-center text-danger">Błąd ładowania danych.</p>
        ) : filteredAssignments.length > 0 ? (
          filteredAssignments.map((technician) => (
            <div key={technician.technicianId}>
              <div className="bg-background py-2 border-b text-center font-bold text-lg">
                <Highlight
                  highlightClassName="bg-yellow-200"
                  searchWords={[searchTerm]}
                  autoEscape
                  textToHighlight={technician.technicianName}
                />
              </div>

              <Droppable droppableId={technician.technicianId!} type="ORDER">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <Table>
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
                          slot.orders.length > 0 ? (
                            slot.orders.map((order, index) => (
                              <Draggable
                                key={order.id}
                                draggableId={order.id}
                                index={index}
                              >
                                {(drag) => (
                                  <TableRow
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    {...drag.dragHandleProps}
                                    className="hover:bg-muted cursor-pointer text-sm uppercase"
                                    onClick={() => {
                                      setSelectedOrderId(order.id)
                                      setIsPanelOpen(true)
                                    }}
                                  >
                                    <TableCell className="text-center border">
                                      {selectedDate.toLocaleDateString('pl-PL')}
                                    </TableCell>

                                    <TableCell className="text-center border">
                                      {timeSlotMap[slot.timeSlot] ??
                                        slot.timeSlot}
                                    </TableCell>

                                    {/* 🔹 Order number with highlight */}
                                    <TableCell className="text-center border font-medium">
                                      <Highlight
                                        highlightClassName="bg-yellow-200"
                                        searchWords={[searchTerm]}
                                        autoEscape
                                        textToHighlight={order.orderNumber}
                                      />
                                    </TableCell>

                                    {/* 🔹 Address with highlight */}
                                    <TableCell className="text-center border">
                                      <Highlight
                                        highlightClassName="bg-yellow-200"
                                        searchWords={[searchTerm]}
                                        autoEscape
                                        textToHighlight={`${order.address}`}
                                      />
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
                                      {/* Optional notes */}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <TableRow key={slot.timeSlot}>
                              <TableCell
                                colSpan={7}
                                className="text-center text-gray-400 border"
                              >
                                Brak zleceń
                              </TableCell>
                            </TableRow>
                          )
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
            Brak wyników wyszukiwania.
          </p>
        )}
      </DragDropContext>

      <OrderDetailsSheet
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

export default AssignmentsTable
