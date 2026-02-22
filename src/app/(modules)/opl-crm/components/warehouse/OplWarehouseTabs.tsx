'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { OplWarehouseItemType } from '@prisma/client'
import OplWarehouseTableTech from '../../(technician)/components/warehouse/OplWarehouseTableTech'
import OplWarehouseTableAdmin from '../../admin-panel/components/warehouse/OplWarehouseTableAdmin'

interface Props {
  searchTerm: string
  categoryFilter: string | null
  value?: 'devices' | 'materials'
  onValueChange?: (value: 'devices' | 'materials') => void
  hideTabsList?: boolean
}

/**
 * OplWarehouseTabs (shared)
 * -------------------------------------------------------------
 * Shared between Admin/Coordinator and Technician views.
 * Automatically picks correct table based on user role.
 */
const OplWarehouseTabs = ({
  searchTerm,
  categoryFilter,
  value,
  onValueChange,
  hideTabsList = false,
}: Props) => {
  const { isTechnician } = useRole()

  return (
    <Tabs
      value={value}
      onValueChange={(next) =>
        onValueChange?.(next as 'devices' | 'materials')
      }
      defaultValue={value ? undefined : 'devices'}
      className="w-full pb-4"
    >
      {!hideTabsList && (
        <TabsList className="w-full grid grid-cols-2 mb-2">
          <TabsTrigger value="devices">Urządzenia</TabsTrigger>
          <TabsTrigger value="materials">Materiały</TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="devices">
        {isTechnician ? (
          <OplWarehouseTableTech
            itemType={OplWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <OplWarehouseTableAdmin
            itemType={OplWarehouseItemType.DEVICE}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>

      <TabsContent value="materials">
        {isTechnician ? (
          <OplWarehouseTableTech
            itemType={OplWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        ) : (
          <OplWarehouseTableAdmin
            itemType={OplWarehouseItemType.MATERIAL}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default OplWarehouseTabs
