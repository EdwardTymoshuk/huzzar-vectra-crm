'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import AssignmentsTable from '../orders/AssignmentsTable'
import PlanningBoard from './PlanningBoard'

/**
 * PlanningTabs:
 * - Switches between "Planowanie" (drag & drop board) and "Zbiórówka".
 */
const PlanningTabs = () => {
  return (
    <Tabs defaultValue="planning" className="w-full">
      <div className="w-full flex justify-center">
        <TabsList className="w-full md:w-1/2 lg:w-1/4 justify-center">
          <TabsTrigger value="planning" className="w-full">
            Planowanie
          </TabsTrigger>
          <TabsTrigger value="assignments" className="w-full">
            Zbiórówka
          </TabsTrigger>
        </TabsList>
      </div>

      {/* --- Planowanie --- */}
      <TabsContent value="planning">
        <PlanningBoard />
      </TabsContent>

      {/* --- Zbiórówka --- */}
      <TabsContent value="assignments">
        <AssignmentsTable />
      </TabsContent>
    </Tabs>
  )
}

export default PlanningTabs
