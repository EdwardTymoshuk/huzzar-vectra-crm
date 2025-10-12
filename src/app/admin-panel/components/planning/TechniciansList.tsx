'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getErrMessage } from '@/utils/errorHandler'
import { trpc } from '@/utils/trpc'
import { addDays, subDays } from 'date-fns'
import { useMemo, useState } from 'react'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { toast } from 'sonner'
import TechniciansTimeline from './TechniciansTimeline'

type Props = { setProcessing: (v: boolean) => void }

/**
 * TechniciansListSkeleton
 * Displays placeholder timeline structure during data loading.
 */
const TechniciansListSkeleton: React.FC = () => (
  <div className="w-full overflow-x-auto border rounded-md bg-background shadow-inner">
    <div
      className="grid border-b bg-muted font-medium text-sm sticky top-0 z-10"
      style={{ gridTemplateColumns: `200px repeat(15, 100px)` }}
    >
      {Array.from({ length: 15 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-10 w-[100px] border-r rounded-none border-gray-300"
        />
      ))}
    </div>

    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="grid border-b text-sm"
        style={{ gridTemplateColumns: `200px repeat(14, 100px)` }}
      >
        <Skeleton className="h-10 w-full border-r rounded-none" />
        <div className="col-span-13 flex items-center">
          <Skeleton className="h-8 w-full mx-2" />
        </div>
      </div>
    ))}
  </div>
)

/**
 * TechniciansList
 * Wrapper that manages filters, date navigation, and data fetching for timeline.
 */
const TechniciansList = ({ setProcessing }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState('')

  const trpcUtils = trpc.useUtils()

  const { data: assignments = [], isLoading } =
    trpc.order.getAssignedOrders.useQuery({
      date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : undefined,
    })

  const assignMutation = trpc.order.assignTechnician.useMutation({
    onError: (err) => toast.error(getErrMessage(err)),
  })

  /** Unassigns order from technician and refreshes data caches. */
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

  /** Day navigation controls. */
  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1))
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1))

  /** Filters technicians by name. */
  const filteredTechnicians = useMemo(() => {
    const existing = assignments.filter(
      (t) => t.technicianId && t.technicianName
    )
    if (!searchTerm) return existing
    const q = searchTerm.toLowerCase()
    return existing.filter((t) => t.technicianName.toLowerCase().includes(q))
  }, [assignments, searchTerm])

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Header: date navigation + search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 mt-2">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            aria-label="Previous day"
          >
            <MdChevronLeft className="w-5 h-5" />
          </Button>

          <div className="scale-105">
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

        <div className="w-full md:w-72">
          <SearchInput
            placeholder="Szukaj technika..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TechniciansListSkeleton />
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex w-full h-52 items-center justify-center">
          <p className="text-center text-muted-foreground">
            Brak techników lub przypisanych zleceń.
          </p>
        </div>
      ) : (
        <TechniciansTimeline
          assignments={filteredTechnicians}
          onUnassign={unassignOrder}
        />
      )}
    </div>
  )
}

export default TechniciansList
