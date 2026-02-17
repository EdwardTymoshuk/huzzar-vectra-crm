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
import { OplTechnicianAssignment } from '@/types/opl-crm'
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
import OrderDetailsSheet from '@/app/(modules)/opl-crm/components/order/OplOrderDetailsSheet'
import { oplTimeSlotMap } from '../../../lib/constants'
import { groupAssignmentsForTeams } from './groupAssignments'
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

  const { data: inProgress = [], isLoading: isInProgressLoading } =
    trpc.opl.order.getAllInProgress.useQuery({
      dateFrom: from,
      dateTo: to,
      orderType: 'INSTALLATION',
    })

  const utils = trpc.useUtils()
  const updateTechnicianMutation =
    trpc.opl.order.assignTechnician.useMutation()

  const {
    data: assignments = [],
    isLoading,
    isError,
  } = trpc.opl.order.getAssignedOrders.useQuery({
    date: selectedDate.toLocaleDateString('en-CA'),
  })
  const groupedAssignments = useMemo(
    () => groupAssignmentsForTeams(assignments),
    [assignments]
  )

  /** 🔹 Handle drag-drop assignment */
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { source, destination, draggableId } = result
    if (source.droppableId === destination.droppableId) return

    const destinationId = destination.droppableId
    const payload =
      destinationId === 'Nieprzypisany'
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

    try {
      await updateTechnicianMutation.mutateAsync({
        id: draggableId,
        ...payload,
      })
      utils.opl.order.getAssignedOrders.invalidate()
    } catch (error) {
      console.error('Error while assigning technician:', error)
    }
  }

  /** 🔍 Filter by technician name, address, or order number */
  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupedAssignments.filter((t) => t.technicianId !== null)
    }

    return groupedAssignments
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
      .filter(Boolean) as OplTechnicianAssignment[]
  }, [groupedAssignments, searchTerm])

  return (
    <div className="space-y-6">
      <UnassignedOrdersAccordion
        data={inProgress}
        loading={isInProgressLoading}
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
            <div
              key={technician.rowId ?? technician.technicianId ?? technician.technicianName}
            >
              <div className="bg-background py-2 border-b text-center font-bold text-lg">
                <Highlight
                  highlightClassName="bg-yellow-200"
                  searchWords={[searchTerm]}
                  autoEscape
                  textToHighlight={technician.technicianName}
                />
              </div>

              <Droppable
                droppableId={
                  technician.dropTargetId ?? technician.technicianId!
                }
                type="ORDER"
              >
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
                        {technician.slots.flatMap((slot) => {
                          const primaryOrders = slot.orders.filter((order) => {
                            const isTeamRow =
                              (technician.teamTechnicianIds?.length ?? 0) > 1
                            const isTeamOrder =
                              (order.assignedTechnicians?.length ?? 0) > 1
                            if (!isTeamRow && isTeamOrder) return false
                            if (isTeamRow) return true
                            if (
                              !order.primaryTechnicianId ||
                              !technician.technicianId
                            ) {
                              return true
                            }
                            return (
                              order.primaryTechnicianId === technician.technicianId
                            )
                          })

                          return primaryOrders.length > 0 ? (
                            primaryOrders.map((order, index) => (
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
                                      {oplTimeSlotMap[slot.timeSlot] ??
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
                                      {order.operator?.trim() || '-'}
                                    </TableCell>

                                    <TableCell
                                      className={`text-center border font-medium ${
                                        statusColorMap[order.status]
                                      }`}
                                    >
                                      {statusMap[order.status]}
                                    </TableCell>

                                    <TableCell className="text-center border text-muted-foreground">
                                      {order.completedByName &&
                                      (order.status === 'COMPLETED' ||
                                        order.status === 'NOT_COMPLETED')
                                        ? `Wykonał: ${order.completedByName}`
                                        : ''}
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
                        })}
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
