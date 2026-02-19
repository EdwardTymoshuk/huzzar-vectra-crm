'use client'

import { OplOrderType } from '@prisma/client'
import OplCompletedMonthlyTypeChart from './OplCompletedMonthlyTypeChart'
import OplOrderStatsSection from './OplOrderStatsSection'
import OplTechnicianEfficiencyTable from './OplTechnicianEfficiencyTable'

type Props = {
  label: string
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OplOrderType
}

const OplDashboardSection = ({ label, date, range, orderType }: Props) => {
  return (
    <section className="mt-2">
      <h2 className="text-lg font-semibold mb-3 text-primary">{label}</h2>
      <OplOrderStatsSection date={date} range={range} orderType={orderType} />
      <OplCompletedMonthlyTypeChart orderType={orderType} />
      <OplTechnicianEfficiencyTable
        date={date}
        range={range}
        orderType={orderType}
      />
    </section>
  )
}

export default OplDashboardSection
