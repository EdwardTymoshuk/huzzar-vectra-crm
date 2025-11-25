'use client'

import { OrderType } from '@prisma/client'
import OrderStatsSection from './OrderStatsSection'
import TechnicianEfficiencyTable from './TechnicianEfficiencyTable'

type Props = {
  label: string
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OrderType
}

/**
 * DashboardSection
 * --------------------------------------------------------------
 * Render:
 *  - section title
 *  - stats (pie + KPIs)
 *  - success chart
 *  - technician ranking
 */
const DashboardSection = ({ label, date, range, orderType }: Props) => {
  return (
    <section className="mt-2">
      <h2 className="text-lg font-semibold mb-3 text-primary">{label}</h2>

      {/* PieChart + KPIs */}
      <OrderStatsSection date={date} range={range} orderType={orderType} />

      {/* Ranking */}
      <TechnicianEfficiencyTable
        date={date}
        range={range}
        orderType={orderType}
      />
    </section>
  )
}

export default DashboardSection
