'use client'

import { useCallback, useState } from 'react'
import TechnicianBillingContent from '../components/billing/TechnicianBillingContent'
import TechnicianBillingHeaderBar from '../components/billing/TechnicianBillingHeaderBar'

/**
 * TechnicianBillingPage
 * -------------------------------------------------------------
 * Refactored monthly settlements view for technicians.
 * - Unified layout: header + scrollable content
 * - Header: title + month picker
 * - Content: stats, codes, daily breakdown
 */
const TechnicianBillingPage = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  const handleChangeMonth = useCallback((date: Date | undefined) => {
    if (date) setSelectedMonth(date)
  }, [])

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* ✅ Header: title + month picker */}
      <TechnicianBillingHeaderBar
        title="Moje rozliczenia"
        selectedMonth={selectedMonth}
        onChangeMonth={handleChangeMonth}
      />

      {/* ✅ Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TechnicianBillingContent selectedMonth={selectedMonth} />
      </div>
    </div>
  )
}

export default TechnicianBillingPage
