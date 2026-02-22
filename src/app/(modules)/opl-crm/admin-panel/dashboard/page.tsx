'use client'

import UnauthorizedPage from '@/app/components/UnauthorizedPage'
import { useRole } from '@/utils/hooks/useRole'
import { OplOrderType } from '@prisma/client'
import { useState } from 'react'
import DashboardHeaderBar from '../../../vectra-crm/admin-panel/components/dashboard/DashboardHeaderBar'
import OplDashboardSection from '../components/dashboard/OplDashboardSection'

const OplDashboardPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  const getSelectedDate = (): Date | undefined => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    return selectedYear
  }

  const handleChangeDate = (date: Date | undefined) => {
    if (!date) return
    if (range === 'day') setSelectedDay(date)
    else if (range === 'month') setSelectedMonth(date)
    else setSelectedYear(date)
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <DashboardHeaderBar
        selectedDate={getSelectedDate()}
        onChangeDate={handleChangeDate}
        range={range}
        onChangeRange={setRange}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <OplDashboardSection
          label="Instalacje"
          date={getSelectedDate()}
          range={range}
          orderType={OplOrderType.INSTALLATION}
        />

        <OplDashboardSection
          label="Serwisy"
          date={getSelectedDate()}
          range={range}
          orderType={OplOrderType.SERVICE}
        />
      </div>
    </div>
  )
}

export default OplDashboardPage
