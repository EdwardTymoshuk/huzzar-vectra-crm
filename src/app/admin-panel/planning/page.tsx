'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import PlanningTabs from '../components/planning/PlanningTabs'

/**
 * PlanningPage:
 * - Contains tabs: "Planowanie" and "Zbiórówka".
 */
const PlanningPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Planer zleceń" />
      <PlanningTabs />
    </MaxWidthWrapper>
  )
}

export default PlanningPage
