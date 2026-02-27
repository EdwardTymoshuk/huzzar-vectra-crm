'use client'

import { Tabs, TabsContent } from '@/app/components/ui/tabs'
import AssignmentsFloatingAction from './AssignmentsFloatingAction'
import MonthlyOrdersAccordion from './MonthlyOrdersAccordion'
import PlanningBoard from './PlanningBoard'
import { usePlanningContext } from './PlanningContext'
import PlanningFloatingAction from './PlanningFloatingAction'

/**
 * PlanningTabs:
 * - Controlled by PlanningContext (activeTab)
 * - Fills available height with independent scrolls.
 */
const PlanningTabs = () => {
  const { activeTab } = usePlanningContext()

  return (
    <Tabs value={activeTab} className="flex flex-col w-full h-full">
      {activeTab === 'planning' && (
        <TabsContent
          value="planning"
          className="flex flex-col flex-1 h-full overflow-hidden"
        >
          <div className="flex-1 overflow-hidden">
            <PlanningBoard />
            <PlanningFloatingAction />
          </div>
        </TabsContent>
      )}

      {activeTab === 'assignments' && (
        <TabsContent
          value="assignments"
          className="flex flex-col flex-1 h-full overflow-hidden"
        >
          <div className="flex-1 overflow-auto">
            <MonthlyOrdersAccordion />
            <AssignmentsFloatingAction />
          </div>
        </TabsContent>
      )}
    </Tabs>
  )
}

export default PlanningTabs
