'use client'

import { PlanningProvider } from '../components/planning/PlanningContext'
import PlanningHeaderBar from '../components/planning/PlanningHeaderBar'
import PlanningTabs from '../components/planning/PlanningTabs'

/**
 * PlanningPage (final)
 * --------------------------------------------------
 * - Provides unified header + shared logic context.
 * - Full viewport layout (minus navbar).
 */
const PlanningPage = () => {
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      <PlanningProvider>
        <PlanningHeaderBar />
        <div className="flex-1 overflow-hidden">
          <PlanningTabs />
        </div>
      </PlanningProvider>
    </div>
  )
}

export default PlanningPage
