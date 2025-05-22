'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import SearchInput from '@/app/components/shared/SearchInput'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { trpc } from '@/utils/trpc'
import { Droppable } from '@hello-pangea/dnd'
import { useEffect, useState } from 'react'
import TechnicianTable from './TechnicianTable'

const TechniciansList = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [expandedTechnicians, setExpandedTechnicians] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const trpcUtils = trpc.useUtils()

  const { data: assignments = [] } = trpc.order.getAssignedOrders.useQuery({
    date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : undefined,
  })

  const assignMutation = trpc.order.assignTechnician.useMutation({
    onSuccess: () => {
      trpcUtils.order.getUnassignedOrders.invalidate()
      trpcUtils.order.getAssignedOrders.invalidate()
    },
  })

  const unassignOrder = async (orderId: string) => {
    await assignMutation.mutateAsync({ id: orderId, assignedToId: undefined })
  }

  const existingTechnicians = assignments.filter(
    (tech) => tech.technicianId && tech.technicianName
  )
  const filteredTechnicians = existingTechnicians.filter((tech) =>
    tech.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAccordionChange = (techValue: string) => {
    if (expandedTechnicians.includes(techValue)) {
      setExpandedTechnicians((prev) => prev.filter((v) => v !== techValue))
    } else {
      setExpandedTechnicians((prev) => [...prev, techValue])
    }
  }

  const expandAccordion = (techId: string) => {
    setExpandedTechnicians((prev) =>
      prev.includes(techId) ? prev : [...prev, techId]
    )
  }

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
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Technicy</h2>
        <div className="w-full">
          <DatePicker
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
