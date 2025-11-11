'use client'

import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import DashboardHeaderBar from '../components/dashboard/DashboardHeaderBar'
import OrderStatsSection from '../components/dashboard/OrderStatsSection'
import SuccessChart from '../components/dashboard/SuccessChart'
import TechnicianEfficiencyTable from '../components/dashboard/TechnicianEfficiencyTable'

/**
 * DashboardPage
 * --------------------------------------------------
 * Displays main dashboard with unified header bar and statistics.
 * Warehousemen cannot access this page.
 */
const DashboardPage = () => {
  // Separate date states per range (to preserve user selection)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  /** Returns the current date according to active range. */
  const getSelectedDate = (): Date | undefined => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    if (range === 'year') return selectedYear
  }

  /** Updates the correct date state when user changes date. */
  const handleChangeDate = (date: Date | undefined) => {
    if (!date) return
    if (range === 'day') setSelectedDay(date)
    else if (range === 'month') setSelectedMonth(date)
    else if (range === 'year') setSelectedYear(date)
  }

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* ✅ Unified dashboard header bar */}
      <DashboardHeaderBar
        selectedDate={getSelectedDate()}
        onChangeDate={handleChangeDate}
        range={range}
        onChangeRange={setRange}
      />

      {/* ✅ Main content below header */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <OrderStatsSection date={getSelectedDate()} range={range} />
        <SuccessChart date={getSelectedDate()} range={range} />
        <TechnicianEfficiencyTable date={getSelectedDate()} range={range} />
      </div>
    </div>
  )
}

export default DashboardPage
