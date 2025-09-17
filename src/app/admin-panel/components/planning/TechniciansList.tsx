'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import SearchInput from '@/app/components/shared/SearchInput'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getErrMessage } from '@/utils/errorHandler'
import { trpc } from '@/utils/trpc'
import { Droppable } from '@hello-pangea/dnd'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import TechnicianTable from './TechnicianTable'

type Props = { setProcessing: (v: boolean) => void }

/** Single technician card skeleton used while assignments are loading. */
const TechnicianCardSkeleton: React.FC = () => (
  <div className="rounded-lg border bg-card">
    <div className="px-4 py-3 border-b">
      <Skeleton className="h-5 w-48" />
    </div>
    <div className="px-4 py-3 space-y-3">
      {/* table header mimic */}
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* a few rows mimic */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr] gap-4 py-2">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

/** Skeleton list container. */
const TechniciansListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <TechnicianCardSkeleton key={i} />
    ))}
  </div>
)

const TechniciansList = ({ setProcessing }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState('')

  const trpcUtils = trpc.useUtils()

  // NOTE: Keep the payload date as YYYY-MM-DD for server-side filtering.
  const {
    data: assignments = [],
    isLoading,
  } = trpc.order.getAssignedOrders.useQuery({
    date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : undefined,
  })

  const assignMutation = trpc.order.assignTechnician.useMutation({
    onError: (err) => toast.error(getErrMessage(err)),
  })

  /** Unassigns an order from a technician and refreshes relevant caches. */
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

  // Filter technicians (only those with defined id & name and matching search)
  const filteredTechnicians = useMemo(() => {
    const existing = assignments.filter((t) => t.technicianId && t.technicianName)
    if (!searchTerm) return existing
    const q = searchTerm.toLowerCase()
    return existing.filter((t) => t.technicianName.toLowerCase().includes(q))
  }, [assignments, searchTerm])

  return (
    <div className="p-4 space-y-4">
      {/* Header (unchanged structure) */}
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Technicy</h2>

        {/* DatePicker in its own row (to match original layout) */}
        <div className="w-full">
          <DatePicker
            range="day"
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date ?? undefined)}
            allowFuture
          />
        </div>

        {/* Search input in its own row (to match original layout) */}
        <div className="w-full">
          <SearchInput
            placeholder="Szukaj technika"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Content (no counters, no extra status line) */}
      {isLoading ? (
        <TechniciansListSkeleton />
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex w-full h-52 items-center justify-center">
          <p className="text-center text-muted-foreground">Brak techników</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTechnicians.map((tech) => {
            const technicianId = tech.technicianId as string
            return (
              <div key={technicianId} className="rounded-lg border bg-card">
                {/* Simple header with only the technician name (no counters) */}
                <div className="px-4 py-3 border-b font-semibold">
                  {tech.technicianName}
                </div>

                {/* Always visible droppable area (accordion removed) */}
                <Droppable droppableId={technicianId} type="ORDER">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={[
                        'p-3 transition',
                        snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-card',
                      ].join(' ')}
                    >
                      <TechnicianTable
                        technicianId={technicianId}
                        slots={tech.slots}
                        onUnassign={unassignOrder}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TechniciansList
