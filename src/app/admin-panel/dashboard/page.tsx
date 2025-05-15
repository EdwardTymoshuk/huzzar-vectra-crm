'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import { useState } from 'react'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import OrderStatsSection from '../components/dashboard/OrderStatsSection'
import TechnicianEfficiencyTable from '../components/dashboard/TechnicianEfficiencyTable'

const DashboardPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [range, setRange] = useState<'day' | 'month' | 'year'>('day')

  return (
    <MaxWidthWrapper>
      <PageHeader title="Dashboard" />
      <DashboardFilters
        selectedDate={selectedDate}
        onChangeDate={(date: Date | undefined) => setSelectedDate(date)}
        range={range}
        onChangeRange={setRange}
      />
      <OrderStatsSection date={selectedDate} range={range} />
      <TechnicianEfficiencyTable date={selectedDate} range={range} />
    </MaxWidthWrapper>
  )
}

export default DashboardPage
