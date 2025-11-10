'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageControlBarProps {
  /** Main title displayed on the left */
  title: string
  /** Optional children: search, datepicker, buttons, etc. */
  children?: ReactNode
  /** Optional class overrides */
  className?: string
}

/**
 * PageControlBar
 * --------------------------------------------------
 * Reusable top bar for all pages (Planer, Magazyn, Rozliczenia, etc.)
 * - Keeps consistent spacing and alignment.
 * - Each page provides its own children (filters, buttons, etc.).
 */
const PageControlBar = ({
  title,
  children,
  className,
}: PageControlBarProps) => {
  return (
    <header
      className={cn(
        'flex flex-col items-center justify-center md:flex-row md:items-center md:justify-between gap-2 border-b bg-background px-3 py-2 z-20 w-full',
        className
      )}
    >
      <h1 className="text-lg font-semibold text-primary">{title}</h1>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      )}
    </header>
  )
}

export default PageControlBar
