'use client'

import { OplOrderType } from '@prisma/client'
import OplCompletedMonthlyTypeChart from './OplCompletedMonthlyTypeChart'
import OplOrangeGoalsSection from './OplOrangeGoalsSection'
import OplOrderStatsSection from './OplOrderStatsSection'
import OplTechnicianEfficiencyTable from './OplTechnicianEfficiencyTable'

type Props = {
  label: string
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OplOrderType
}

const OplDashboardSection = ({ label, date, range, orderType }: Props) => {
  const isInstallation = orderType === OplOrderType.INSTALLATION

  return (
    <section className="mt-2">
      <h2 className="text-lg font-semibold mb-3 text-secondary dark:text-primary">
        {label}
      </h2>
      {isInstallation ? <OplOrangeGoalsSection date={date} range={range} /> : null}
      <OplOrderStatsSection date={date} range={range} orderType={orderType} />
      <OplCompletedMonthlyTypeChart orderType={orderType} />
      {!isInstallation ? (
        <OplTechnicianEfficiencyTable
          date={date}
          range={range}
          orderType={orderType}
        />
      ) : null}
    </section>
  )
}

export default OplDashboardSection
