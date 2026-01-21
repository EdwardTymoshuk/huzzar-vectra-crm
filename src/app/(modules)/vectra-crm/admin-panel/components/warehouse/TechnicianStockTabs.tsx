'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { VectraTechnicianStockItem } from '@/types/vectra-crm'
import TechnicianStockTable from './TechnicianStockTable'

type Props = {
  items: VectraTechnicianStockItem[]
  searchTerm: string
}

/**
 * TechnicianStockTabs:
 * - Renders stock items in separate tabs: devices and materials.
 * - Passes correct itemType to TechnicianStockTable.
 */
const TechnicianStockTabs = ({ items, searchTerm }: Props) => {
  const devices = items.filter((i) => i.itemType === 'DEVICE')
  const materials = items.filter((i) => i.itemType === 'MATERIAL')

  return (
    <Tabs defaultValue="devices" className="w-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="devices">Urządzenia</TabsTrigger>
        <TabsTrigger value="materials">Materiały</TabsTrigger>
      </TabsList>

      <TabsContent value="devices">
        <TechnicianStockTable
          items={devices}
          itemType="DEVICE"
          searchTerm={searchTerm}
        />
      </TabsContent>
      <TabsContent value="materials">
        <TechnicianStockTable
          items={materials}
          itemType="MATERIAL"
          searchTerm={searchTerm}
        />
      </TabsContent>
    </Tabs>
  )
}

export default TechnicianStockTabs
