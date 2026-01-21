'use client'

import WarehouseTableAdmin from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/WarehouseTableAdmin'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { OplWarehouseItemType } from '@prisma/client'
import WarehouseTableTech from '../../(technician)/components/warehouse/WarehouseTableTech'

interface Props {
  searchTerm: string
  categoryFilter: string | null
}

/**
 * WarehouseTabs (shared)
 * -------------------------------------------------------------
 * Shared between Admin/Coordinator and Technician views.
 * Automatically picks correct table based on user role.
 */
const WarehouseTabs = ({ searchTerm, categoryFilter }: Props) => {
  const { isTechnician } = useRole()

  return (
    <Tabs defaultValue="devices" className="w-full pb-4">
      <TabsList className="w-full grid grid-cols-2 mb-2">
        <TabsTrigger value="devices">Urządzenia</TabsTrigger>
        <TabsTrigger value="materials">Materiały</TabsTrigger>
      </TabsList>

      <TabsContent value="devices">
        {isTechnician ? (
          <WarehouseTableTech
            itemType={OplWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <WarehouseTableAdmin
            itemType={OplWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>

      <TabsContent value="materials">
        {isTechnician ? (
          <WarehouseTableTech
            itemType={OplWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <WarehouseTableAdmin
            itemType={OplWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default WarehouseTabs
