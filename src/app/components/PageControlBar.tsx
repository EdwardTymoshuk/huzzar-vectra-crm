'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Separator } from './ui/separator'

interface PageControlBarProps {
  title: string
  children?: ReactNode
  className?: string
  rightActions?: ReactNode
}

/**
 * PageControlBar
 * ------------------------------------------------------------------
 * Shared top header:
 *  - Title + action buttons (left-aligned)
 *  - Controls (tabs, filters, search) on the right side
 *  - Mobile: stacked
 *  - md–lg: compact mode (icons only if needed)
 *  - lg+: full layout
 */
const PageControlBar = ({
  title,
  children,
  className,
  rightActions,
}: PageControlBarProps) => {
  return (
    <header
      className={cn(
        'flex flex-row items-center lg:items-center',
        'justify-start lg:justify-between',
        'gap-2 lg:gap-4 w-full border-b bg-background py-2 mb-3 z-20',
        'px-1',
        className
      )}
    >
      {/* LEFT SIDE: title + actions */}
      <div className="flex items-center gap-2 w-full lg:w-auto">
        <h1 className="text-lg font-semibold text-primary whitespace-nowrap">
          {title}
        </h1>

        <Separator orientation="vertical" />

        {/* Desktop-only left actions */}
        {rightActions && (
          <div className="hidden lg:flex items-center gap-2 ml-4">
            {rightActions}
          </div>
        )}
      </div>

      {/* RIGHT SIDE: main controls (tabs/date/search) */}
      {children && (
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2 items-center lg:justify-end">
          {children}
        </div>
      )}
    </header>
  )
}

export default PageControlBar
