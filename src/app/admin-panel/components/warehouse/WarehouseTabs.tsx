'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import WarehouseTable from './WarehouseTable'

/**
 * WarehouseTabs:
 * - Displays three tabs for managing warehouse inventory: Devices, Materials, and Subscriber Endings (ZA).
 * - Each tab displays a filtered list of items based on their type or subcategory.
 */

type Props = {
  searchTerm: string
}

const WarehouseTabs = ({ searchTerm }: Props) => {
  return (
    <Tabs defaultValue="devices" className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="devices">Urządzenia</TabsTrigger>
        <TabsTrigger value="materials">Materiały</TabsTrigger>
        <TabsTrigger value="ua">UA</TabsTrigger>
      </TabsList>

      {/* Devices tab */}
      <TabsContent value="devices">
        <WarehouseTable itemType="DEVICE" searchTerm={searchTerm} />
      </TabsContent>

      <TabsContent value="materials">
        <WarehouseTable itemType="MATERIAL" searchTerm={searchTerm} />
      </TabsContent>

      <TabsContent value="ua">
        <WarehouseTable
          itemType="DEVICE"
          subcategoryFilter="UA"
          searchTerm={searchTerm}
        />
      </TabsContent>
    </Tabs>
  )
}

export default WarehouseTabs
