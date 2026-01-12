'use client'

import WarehouseTableTech from '@/app/(modules)/vectra-crm/(technician)/components/warehouse/WarehouseTable'
import WarehouseTableAdmin from '@/app/(modules)/vectra-crm/admin-panel/components/warehouse/WarehouseTable'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { VectraWarehouseItemType } from '@prisma/client'

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
            itemType={VectraWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <WarehouseTableAdmin
            itemType={VectraWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>

      <TabsContent value="materials">
        {isTechnician ? (
          <WarehouseTableTech
            itemType={VectraWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <WarehouseTableAdmin
            itemType={VectraWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default WarehouseTabs
