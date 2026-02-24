'use client'
import React from 'react'

/**
 * One-line key/value row – read-only.
 */
const ReadonlyRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[minmax(130px,auto)_1fr] sm:gap-2 sm:items-start">
    <span className="font-semibold text-foreground/90 break-words">
      {label}:
    </span>
    <span className="break-words text-muted-foreground sm:text-foreground">
      {value}
    </span>
  </div>
)

export default ReadonlyRow
