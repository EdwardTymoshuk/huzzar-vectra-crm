'use client'

import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { OplWarehouseAction } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import OplWarehouseHistoryFilterPopover from './OplWarehouseHistoryFilterPopover'

interface OplWarehouseHistoryHeaderBarProps {
  actions: OplWarehouseAction[] | undefined
  setActions: (v: OplWarehouseAction[] | undefined) => void
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
 * OplWarehouseHistoryHeaderBar
 * ------------------------------------------------------------------
 * Responsive header for warehouse history view.
 * - Desktop (md+): Back on left, Filter + Title on right (same row)
 * - Mobile (<md):  Back + Title on top row, Filter centered below
 */
const OplWarehouseHistoryHeaderBar = ({
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
}: OplWarehouseHistoryHeaderBarProps) => {
  const router = useRouter()

  return (
    <header
      className={cn(
        'flex flex-col w-full border-b bg-background py-2 px-2 md:px-4 gap-2 mb-2',
        className
      )}
    >
      {/* --- Desktop layout (md+) --- */}
      <div className="hidden md:flex items-center justify-between w-full">
        {/* Left: back button + title */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1 shrink-0"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
            <span>Powrót</span>
          </Button>
          <h1 className="text-sm lg:text-lg font-semibold text-primary truncate">
            Historia magazynu
          </h1>
        </div>

        {/* Right: filters */}
        <OplWarehouseHistoryFilterPopover
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

      {/* --- Mobile layout (<md) --- */}
      <div className="flex justify-between items-center md:hidden gap-2">
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
        <OplWarehouseHistoryFilterPopover
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
    </header>
  )
}

export default OplWarehouseHistoryHeaderBar
