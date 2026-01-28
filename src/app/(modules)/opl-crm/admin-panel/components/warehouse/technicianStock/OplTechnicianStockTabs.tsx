'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { OplTechnicianStockItem } from '@/types/opl-crm'
import OplTechnicianStockTable from './OplTechnicianStockTable'

type Props = {
  items: OplTechnicianStockItem[]
  searchTerm: string
}

/**
 * OplTechnicianStockTabs:
 * - Renders stock items in separate tabs: devices and materials.
 * - Passes correct itemType to TechnicianStockTable.
 */
const OplTechnicianStockTabs = ({ items, searchTerm }: Props) => {
  const devices = items.filter((i) => i.itemType === 'DEVICE')
  const materials = items.filter((i) => i.itemType === 'MATERIAL')

  return (
    <Tabs defaultValue="devices" className="w-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="devices">Urządzenia</TabsTrigger>
        <TabsTrigger value="materials">Materiały</TabsTrigger>
      </TabsList>

      <TabsContent value="devices">
        <OplTechnicianStockTable
          items={devices}
          itemType="DEVICE"
          searchTerm={searchTerm}
        />
      </TabsContent>
      <TabsContent value="materials">
        <OplTechnicianStockTable
          items={materials}
          itemType="MATERIAL"
          searchTerm={searchTerm}
        />
      </TabsContent>
    </Tabs>
  )
}

export default OplTechnicianStockTabs
