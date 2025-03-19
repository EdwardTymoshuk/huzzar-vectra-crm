'use client'

import DatePicker from '@/app/components/DatePicker'
import SearchInput from '@/app/components/SearchInput'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { timeSlotMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { useEffect, useState } from 'react'
import { MdClose } from 'react-icons/md'

/**
 * Displays a list of technicians (multiple accordions).
 * Each assigned order is Draggable.
 * Has a button "X" to unassign the order (move it back to unassigned).
 */
const TechniciansList = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedTechnicians, setExpandedTechnicians] = useState<string[]>([])

  const trpcUtils = trpc.useUtils()

  // Query assigned orders for chosen date
  const { data: assignments = [] } = trpc.order.getAssignedOrders.useQuery({
    date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : undefined,
  })

  // Mutation for assigning/unassigning orders
  const assignMutation = trpc.order.assignTechnician.useMutation({
    onSuccess: () => {
      trpcUtils.order.getUnassignedOrders.invalidate()
      trpcUtils.order.getAssignedOrders.invalidate()
    },
  })

  // unassign => assignedToId = undefined
  const unassignOrder = async (orderId: string) => {
    await assignMutation.mutateAsync({ id: orderId, assignedToId: undefined })
  }

  // Filter out invalid technicians and apply search
  const existingTechnicians = assignments.filter(
    (tech) => tech.technicianId && tech.technicianName
  )
  const filteredTechnicians = existingTechnicians.filter((tech) =>
    tech.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Multiple open accordion
  const handleAccordionChange = (techValue: string) => {
    if (expandedTechnicians.includes(techValue)) {
      setExpandedTechnicians((prev) => prev.filter((v) => v !== techValue))
    } else {
      setExpandedTechnicians((prev) => [...prev, techValue])
    }
  }

  // Function to expand accordion if not already expanded.
  const expandAccordion = (techId: string) => {
    setExpandedTechnicians((prev) =>
      prev.includes(techId) ? prev : [...prev, techId]
    )
  }

  /**
   * DroppableContent component:
   * - Wraps the droppable area.
   * - Uses useEffect to automatically open the accordion when an order is dragged over.
   */
  const DroppableContent: React.FC<{
    technicianId: string
    isDraggingOver: boolean
    children: React.ReactNode
  }> = ({ technicianId, isDraggingOver, children }) => {
    useEffect(() => {
      if (isDraggingOver) {
        expandAccordion(technicianId)
      }
    }, [isDraggingOver, technicianId])
    return <div>{children}</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* DatePicker and search input */}
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Technicy</h2>
        <div className={`w-full ${selectedDate ? 'text-primary' : ''}`}>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date ?? undefined)}
          />
        </div>
        <div className="w-full">
          <SearchInput
            placeholder="Szukaj technika"
            onSearch={(value) => setSearchTerm(value)}
          />
        </div>
      </div>

      {filteredTechnicians.length === 0 ? (
        <div className="flex w-full h-52 items-center justify-center">
          <p className="text-center text-gray-500">Brak techników</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          className="w-full"
          value={expandedTechnicians}
        >
          {filteredTechnicians.map((tech) => {
            const technicianId = tech.technicianId as string

            return (
              <AccordionItem key={technicianId} value={technicianId}>
                <AccordionTrigger
                  onClick={() => handleAccordionChange(technicianId)}
                >
                  {tech.technicianName}
                </AccordionTrigger>
                <AccordionContent>
                  <Droppable droppableId={technicianId} type="ORDER">
                    {(provided, snapshot) => {
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-2 border rounded-md transition ${
                            snapshot.isDraggingOver
                              ? 'border-blue-500 bg-blue-100'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {/* Wrap content with DroppableContent to auto-expand on hover */}
                          <DroppableContent
                            technicianId={technicianId}
                            isDraggingOver={snapshot.isDraggingOver}
                          >
                            <Table className="border rounded-lg w-full">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-center w-1/3">
                                    Slot czasowy
                                  </TableHead>
                                  <TableHead className="text-center w-2/3">
                                    Zlecenia
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tech.slots.length > 0 ? (
                                  tech.slots.map((slot) => (
                                    <TableRow key={slot.timeSlot}>
                                      <TableCell className="text-center font-semibold w-1/3">
                                        {timeSlotMap[slot.timeSlot]}
                                      </TableCell>
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
                                                    className="p-2 bg-gray-100 rounded-md text-sm my-1 flex justify-between items-center gap-2"
                                                  >
                                                    <div>
                                                      <strong>
                                                        {order.orderNumber}
                                                      </strong>
                                                      <br />
                                                      {order.address}
                                                    </div>
                                                    <button
                                                      onClick={() =>
                                                        unassignOrder(order.id)
                                                      }
                                                      className="text-gray-600 hover:text-red-600"
                                                    >
                                                      <MdClose />
                                                    </button>
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
                          </DroppableContent>
                          {provided.placeholder}
                        </div>
                      )
                    }}
                  </Droppable>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}

export default TechniciansList
