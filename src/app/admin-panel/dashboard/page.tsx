'use client'

import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import { useRole } from '@/utils/hooks/useRole'
import { VectraOrderType } from '@prisma/client'
import { useState } from 'react'
import DashboardHeaderBar from '../components/dashboard/DashboardHeaderBar'
import DashboardSection from '../components/dashboard/DashboardSection'

/**
 * DashboardPage
 * --------------------------------------------------
 * Main dashboard container:
 * - Uses shared date & range selector.
 * - Renders 3 independent dashboard sections:
 *    • INSTALLATIONS
 *    • SERVICES
 *    • LINES
 * Warehousemen cannot access this page.
 */
const DashboardPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  /** Returns currently active date based on the selected range. */
  const getSelectedDate = (): Date | undefined => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    return selectedYear
  }

  /** Updates the appropriate date state. */
  const handleChangeDate = (date: Date | undefined) => {
    if (!date) return
    if (range === 'day') setSelectedDay(date)
    else if (range === 'month') setSelectedMonth(date)
    else setSelectedYear(date)
  }

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* Dashboard controls */}
      <DashboardHeaderBar
        selectedDate={getSelectedDate()}
        onChangeDate={handleChangeDate}
        range={range}
        onChangeRange={setRange}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <DashboardSection
          label="Instalacje"
          date={getSelectedDate()}
          range={range}
          orderType={VectraOrderType.INSTALATION}
        />

        <DashboardSection
          label="Serwisy"
          date={getSelectedDate()}
          range={range}
          orderType={VectraOrderType.SERVICE}
        />

        <DashboardSection
          label="Linie"
          date={getSelectedDate()}
          range={range}
          orderType={VectraOrderType.OUTAGE}
        />
      </div>
    </div>
  )
}

export default DashboardPage
