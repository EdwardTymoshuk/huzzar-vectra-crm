'use client'

import DashboardHeaderBar from '@/app/(modules)/vectra-crm/admin-panel/components/dashboard/DashboardHeaderBar'
import { buildDateParam } from '@/utils/dates/buildDateParam'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'

import { DashboardStatsSkeleton } from '../components/dashboard/DashboardStatsSkeleton'
import { EarningsKpisSkeleton } from '../components/dashboard/EarningsKpisSkeleton'
import TechEarningsKpis from '../components/dashboard/TechEarningsKpis'
import TechOrderStatsSection from '../components/dashboard/TechOrderStatsSection'

const TechnicianDashboardPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedYear, setSelectedYear] = useState<Date>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('month')

  const getSelectedDate = (): Date | undefined => {
    if (range === 'day') return selectedDay
    if (range === 'month') return selectedMonth
    if (range === 'year') return selectedYear
  }

  const selectedDate = getSelectedDate()
  const dateParam = buildDateParam(selectedDate, range)

  // Fetch ALL data
  const techStats = trpc.vectra.order.getTechOrderStats.useQuery({
    date: dateParam,
    range,
  })

  const successTrend = trpc.vectra.order.getTechSuccessOverTime.useQuery({
    date: selectedDate ?? new Date(),
    range,
  })

  const earnings = trpc.vectra.order.getTechEarningsKpis.useQuery({
    date: dateParam,
    range,
  })

  const goals = trpc.core.user.getGoals.useQuery()

  const handleChangeDate = (date: Date | undefined) => {
    if (!date) return
    if (range === 'day') setSelectedDay(date)
    else if (range === 'month') setSelectedMonth(date)
    else if (range === 'year') setSelectedYear(date)
  }

  const isLoading =
    techStats.isLoading || successTrend.isLoading || earnings.isLoading

  const hasAllData = !!techStats.data && !!successTrend.data && !!earnings.data

  const isError =
    techStats.isError ||
    successTrend.isError ||
    earnings.isError ||
    goals.isError

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <DashboardHeaderBar
        selectedDate={selectedDate}
        onChangeDate={handleChangeDate}
        range={range}
        onChangeRange={setRange}
      />

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading || isError || !hasAllData ? (
          <>
            <DashboardStatsSkeleton />
            <EarningsKpisSkeleton />
          </>
        ) : (
          <>
            <TechOrderStatsSection
              date={selectedDate}
              range={range}
              data={techStats.data}
              successData={successTrend.data ?? []}
            />

            <TechEarningsKpis
              date={selectedDate}
              range={range}
              data={earnings.data}
              goals={goals.data ?? null}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default TechnicianDashboardPage
