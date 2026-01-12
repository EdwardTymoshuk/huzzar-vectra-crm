'use client'

import MonthPicker from '@/app/components/MonthPicker'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'

interface TechnicianDetailsHeaderBarProps {
  /** Main header title, e.g. "Rozliczenie technika" */
  title: string
  /** Currently selected month */
  selectedMonth: Date
  /** Fired when month is changed in the picker */
  onChangeMonth: (d: Date) => void
  /** Optional extra className */
  className?: string
}

/**
 * TechnicianDetailsHeaderBar (Admin)
 * -------------------------------------------------------
 * Detail view header bar for technician monthly settlements.
 * Layout: back button on the left, title + month picker on the right.
 * Matches style of WarehouseItemDetailHeaderBar for visual consistency.
 */
const TechnicianDetailsHeaderBar = ({
  title,
  selectedMonth,
  onChangeMonth,
  className,
}: TechnicianDetailsHeaderBarProps) => {
  const router = useRouter()

  return (
    <header
      className={cn(
        'flex items-center justify-between w-full border-b bg-background py-2 gap-2 mb-2',
        className
      )}
    >
      {/* Left: back button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1"
        >
          <MdKeyboardArrowLeft className="w-5 h-5" />
          <span>Powrót</span>
        </Button>
      </div>

      {/* Right: title + month picker */}
      <div className="flex items-center gap-3">
        <MonthPicker
          selected={selectedMonth}
          onChange={(d) => {
            if (d) onChangeMonth(d)
          }}
        />
        <h1 className="text-sm lg:text-lg font-semibold text-primary">
          {title}
        </h1>
      </div>
    </header>
  )
}

export default TechnicianDetailsHeaderBar
