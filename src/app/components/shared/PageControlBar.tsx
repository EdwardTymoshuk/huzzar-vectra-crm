'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageControlBarProps {
  title: string
  children?: ReactNode
  className?: string
}

/**
 * PageControlBar
 * --------------------------------------------------
 * Shared top header for all pages.
 * - Edge-to-edge layout on mobile
 * - Left/right layout on larger screens
 */
const PageControlBar = ({
  title,
  children,
  className,
}: PageControlBarProps) => {
  return (
    <header
      className={cn(
        'flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between',
        'gap-2 sm:gap-3 w-full border-b bg-background py-2 mb-3 z-20',
        'px-1',
        className
      )}
    >
      <h1 className="text-lg font-semibold text-primary w-full sm:w-fit text-center sm:text-left">
        {title}
      </h1>

      {children && (
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 items-center justify-center sm:justify-end">
          {children}
        </div>
      )}
    </header>
  )
}

export default PageControlBar
