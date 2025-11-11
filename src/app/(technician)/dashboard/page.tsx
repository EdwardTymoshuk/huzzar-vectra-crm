'use client'

import DashboardHeaderBar from '@/app/admin-panel/components/dashboard/DashboardHeaderBar'
import { useState } from 'react'
import TechEarningsKpis from '../components/dashboard/TechEarningsKpis'
import TechEarningsMonthlyChart from '../components/dashboard/TechEarningsMonthlyChart'
import TechOrderStatsSection from '../components/dashboard/TechOrderStatsSection'

/**
 * Technician Pulpit Page
 * - Mirrors the admin dashboard structure (range tabs + date picker).
 * - Shows KPIs and charts scoped strictly to the logged-in technician.
 */
const TechnicianDashboardPage = () => {
  // Separate date states per range (to preserve user selection)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

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
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TechEarningsKpis date={getSelectedDate()} range={range} />
        <TechOrderStatsSection date={getSelectedDate()} range={range} />

        <TechEarningsMonthlyChart
          year={(getSelectedDate() ?? new Date()).getFullYear()}
        />
      </div>
    </div>
  )
}

export default TechnicianDashboardPage
