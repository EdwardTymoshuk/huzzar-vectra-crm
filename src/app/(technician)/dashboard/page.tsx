'use client'

import DashboardFilters from '@/app/admin-panel/components/dashboard/DashboardFilters'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import TechEarningsKpis from '../components/dashboard/TechEarningsKpis'
import TechEarningsMonthlyChart from '../components/dashboard/TechEarningsMonthlyChart'
import TechOrderStatsSection from '../components/dashboard/TechOrderStatsSection'

/**
 * Technician Dashboard Page
 * - Mirrors the admin dashboard structure (range tabs + date picker).
 * - Shows KPIs and charts scoped strictly to the logged-in technician.
 */
const TechnicianDashboardPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

  const getSelectedDate = (): Date | undefined => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    if (range === 'year') return selectedYear
    return undefined
  }

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

      {/* KPI: Zarobki + dynamika vs poprzedni okres */}
      <TechEarningsKpis date={getSelectedDate()} range={range} />

      {/* Statystyki zleceń technika (kołowy wykres skuteczności + liczby) */}
      <TechOrderStatsSection date={getSelectedDate()} range={range} />

      {/* Wykres miesięcznych zarobków dla bieżącego roku */}
      <TechEarningsMonthlyChart
        year={(getSelectedDate() ?? new Date()).getFullYear()}
      />
    </MaxWidthWrapper>
  )
}

export default TechnicianDashboardPage
