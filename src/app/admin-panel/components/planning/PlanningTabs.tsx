'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import AssignmentsTable from './AssignmentsTable'
import AssignmentsToolbar from './AssignmentsToolbar'
import PlanningBoard from './PlanningBoard'
import PlanningToolbar from './PlanningToolbar'

/**
 * PlanningTabs:
 * - Tab "Planowanie": planning toolbar (import + manual add) + board.
 * - Tab "Zbiórówka": assignments toolbar (report only) + table.
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

      {/* Planning tab: toolbar + board */}
      <TabsContent value="planning">
        <PlanningToolbar />
        <PlanningBoard />
      </TabsContent>

      {/* Assignments tab: toolbar + table */}
      <TabsContent value="assignments">
        <AssignmentsToolbar />
        <AssignmentsTable />
      </TabsContent>
    </Tabs>
  )
}

export default PlanningTabs
