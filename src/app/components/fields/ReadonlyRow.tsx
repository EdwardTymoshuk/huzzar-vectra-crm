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
  <div className="flex justify-between text-sm">
    <span className="font-semibold">{label}:</span>
    <span>{value}</span>
  </div>
)

export default ReadonlyRow
