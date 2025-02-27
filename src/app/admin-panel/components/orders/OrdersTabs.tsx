'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import OrdersTable from './OrdersTable'

/**
 * OrdersTabs component:
 * - Switches between 'Lista zleceń' and 'Podział zleceń'
 */
const OrdersTabs = () => {
  return (
    <Tabs defaultValue="list" className="w-full">
      <div className="w-full flex justify-center">
        <TabsList className="w-full md:w-1/2 lg:w-1/4 justify-center">
          <TabsTrigger value="list" className="w-full">
            Lista zleceń
          </TabsTrigger>
          <TabsTrigger value="assignments" className="w-full">
            Zbiórówka
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="list">
        <OrdersTable />
      </TabsContent>
      <TabsContent value="assignments">
        <div className="h-96 flex justify-center items-center text-gray-400">
          Podział zleceń między technikami (W przygotowaniu)
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default OrdersTabs
