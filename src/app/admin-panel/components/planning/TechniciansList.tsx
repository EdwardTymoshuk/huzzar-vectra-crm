'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import SearchInput from '@/app/components/shared/SearchInput'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { getErrMessage } from '@/utils/errorHandler'
import { trpc } from '@/utils/trpc'
import { Droppable } from '@hello-pangea/dnd'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import TechnicianTable from './TechnicianTable'

type Props = { setProcessing: (v: boolean) => void }

const TechniciansList = ({ setProcessing }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [expandedTechnicians, setExpandedTechnicians] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const trpcUtils = trpc.useUtils()

  // NOTE: Keep the payload date as YYYY-MM-DD (en-CA) for server-side filtering.
  const { data: assignments = [] } = trpc.order.getAssignedOrders.useQuery({
    date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : undefined,
  })

  const assignMutation = trpc.order.assignTechnician.useMutation({
    // Centralize toast on mutation errors as well
    onError: (err) => {
      toast.error(getErrMessage(err))
    },
  })

  /**
   * Unassigns an order from a technician and refreshes relevant caches.
   * Shows UX-friendly toasts and never leaks raw error details.
   */
  const unassignOrder = async (orderId: string) => {
    setProcessing(true)
    try {
      await assignMutation.mutateAsync({ id: orderId, assignedToId: undefined })
      await Promise.all([
        trpcUtils.order.getUnassignedOrders.invalidate(),
        trpcUtils.order.getAssignedOrders.invalidate(),
      ])
    } catch (err: unknown) {
      toast.error(getErrMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  // Filter technicians (only those with defined id & name)
  const existingTechnicians = assignments.filter(
    (tech) => tech.technicianId && tech.technicianName
  )

  const filteredTechnicians = existingTechnicians.filter((tech) =>
    tech.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  /** Toggles an accordion item by technician id. */
  const handleAccordionChange = (techValue: string) => {
    setExpandedTechnicians((prev) =>
      prev.includes(techValue)
        ? prev.filter((v) => v !== techValue)
        : [...prev, techValue]
    )
  }

  /** Expands an accordion item if not already expanded. */
  const expandAccordion = (techId: string) => {
    setExpandedTechnicians((prev) =>
      prev.includes(techId) ? prev : [...prev, techId]
    )
  }

  /**
   * Wrapper used to auto-expand a technician panel when an item is dragged over it.
   * This improves DnD ergonomics on narrow/mobile screens.
   */
  const DroppableContent: React.FC<{
    technicianId: string
    isDraggingOver: boolean
    children: React.ReactNode
  }> = ({ technicianId, isDraggingOver, children }) => {
    useEffect(() => {
      if (isDraggingOver) expandAccordion(technicianId)
    }, [isDraggingOver, technicianId])
    return <div>{children}</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Technicy</h2>

        <div className="w-full">
          <DatePicker
            range="day"
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date ?? undefined)}
          />
        </div>

        <div className="w-full">
          <SearchInput
            placeholder="Szukaj technika"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {filteredTechnicians.length === 0 ? (
        <div className="flex w-full h-52 items-center justify-center">
          <p className="text-center text-muted-foreground">Brak techników</p>
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
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 rounded-md transition border ${
                          snapshot.isDraggingOver
                            ? 'border-blue-500 bg-muted'
                            : 'border-border bg-card'
                        }`}
                      >
                        <DroppableContent
                          technicianId={technicianId}
                          isDraggingOver={snapshot.isDraggingOver}
                        >
                          <TechnicianTable
                            technicianId={technicianId}
                            slots={tech.slots}
                            onUnassign={unassignOrder}
                          />
                        </DroppableContent>

                        {provided.placeholder}
                      </div>
                    )}
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
