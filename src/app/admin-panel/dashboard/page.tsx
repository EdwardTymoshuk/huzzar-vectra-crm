'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import { useRole } from '@/utils/roleHelpers/useRole'
import { useState } from 'react'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import OrderStatsSection from '../components/dashboard/OrderStatsSection'
import TechnicianEfficiencyTable from '../components/dashboard/TechnicianEfficiencyTable'

/**
 * DashboardPage
 * Displays main dashboard with filters and stats.
 * Each range (day/month/year) keeps its own date state.
 */
const DashboardPage = () => {
  // Separate date states for each range
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('day')

  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  // Returns date for the current range
  const getSelectedDate = () => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    if (range === 'year') return selectedYear
  }

  // Updates the correct date state when date changes
  const handleChangeDate = (date: Date | undefined) => {
    if (!date) return
    if (range === 'day') setSelectedDay(date)
    else if (range === 'month') setSelectedMonth(date)
    else if (range === 'year') setSelectedYear(date)
  }

  return (
    <MaxWidthWrapper>
      <PageHeader title="Dashboard" />
      <DashboardFilters
        selectedDate={getSelectedDate()}
        onChangeDate={handleChangeDate}
        range={range}
        onChangeRange={setRange}
      />
      <OrderStatsSection date={getSelectedDate()} range={range} />
      <TechnicianEfficiencyTable date={getSelectedDate()} range={range} />
    </MaxWidthWrapper>
  )
}

export default DashboardPage
