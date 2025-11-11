'use client'

import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { WarehouseAction } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import WarehouseHistoryFilterPopover from './WarehouseHistoryFilterPopover'

interface WarehouseHistoryHeaderBarProps {
  actions: WarehouseAction[] | undefined
  setActions: (v: WarehouseAction[] | undefined) => void
  performerId: string | undefined
  setPerformerId: (v: string | undefined) => void
  startDate: Date | undefined
  setStartDate: (v: Date | undefined) => void
  endDate: Date | undefined
  setEndDate: (v: Date | undefined) => void
  locationId: string | undefined
  setLocationId: (v: string | undefined) => void
  className?: string
}

/**
 * WarehouseHistoryHeaderBar
 * ------------------------------------------------------------------
 * Responsive header for warehouse history view.
 * - Desktop (md+): Back on left, Filter + Title on right (same row)
 * - Mobile (<md):  Back + Title on top row, Filter centered below
 */
const WarehouseHistoryHeaderBar = ({
  actions,
  setActions,
  performerId,
  setPerformerId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  locationId,
  setLocationId,
  className,
}: WarehouseHistoryHeaderBarProps) => {
  const router = useRouter()

  return (
    <header
      className={cn(
        'flex flex-col w-full border-b bg-background py-2 gap-2 mb-2',
        className
      )}
    >
      {/* --- Desktop layout (md+) --- */}
      <div className="hidden md:flex items-center justify-between w-full">
        {/* Left: back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1"
        >
          <MdKeyboardArrowLeft className="w-5 h-5" />
          <span>Powrót</span>
        </Button>

        {/* Right: filters + title */}
        <div className="flex items-center gap-3">
          <WarehouseHistoryFilterPopover
            actions={actions}
            setActions={setActions}
            performerId={performerId}
            setPerformerId={setPerformerId}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            locationId={locationId}
            setLocationId={setLocationId}
          />
          <h1 className="text-sm lg:text-lg font-semibold text-primary whitespace-nowrap">
            Historia magazynu
          </h1>
        </div>
      </div>

      {/* --- Mobile layout (<md) --- */}
      <div className="flex flex-col md:hidden gap-2">
        {/* Top row: back + title */}
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
            <span>Powrót</span>
          </Button>

          <h1 className="text-sm font-semibold text-primary whitespace-nowrap">
            Historia magazynu
          </h1>
        </div>

        {/* Bottom row: centered filter */}
        <div className="flex justify-center">
          <WarehouseHistoryFilterPopover
            actions={actions}
            setActions={setActions}
            performerId={performerId}
            setPerformerId={setPerformerId}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            locationId={locationId}
            setLocationId={setLocationId}
          />
        </div>
      </div>
    </header>
  )
}

export default WarehouseHistoryHeaderBar
