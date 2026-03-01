'use client'

import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'

interface OplWarehouseItemDetailHeaderBarProps {
  /** Page title, e.g. "Router Technicolor TG789" */
  title: string
  /** Optional additional content (e.g. actions) */
  actions?: React.ReactNode
  className?: string
}

/**
 * OplWarehouseItemDetailHeaderBar
 * -------------------------------------------------------
 * Specialized header for warehouse item details.
 * Layout: back button on the left, title on the right.
 * Consistent with detail views (orders, materials, etc.).
 */
const OplWarehouseItemDetailHeaderBar = ({
  title,
  actions,
  className,
}: OplWarehouseItemDetailHeaderBarProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const handleBack = () => {
    router.push(from ? decodeURIComponent(from) : '/opl-crm/admin-panel?tab=warehouse')
  }

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
          onClick={handleBack}
          className="flex items-center gap-1"
        >
          <MdKeyboardArrowLeft className="w-5 h-5" />
          <span>Powrót</span>
        </Button>
      </div>

      {/* Right: title + optional actions */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm lg:text-lg font-semibold text-primary">
          {title}
        </h1>
        {actions}
      </div>
    </header>
  )
}

export default OplWarehouseItemDetailHeaderBar
