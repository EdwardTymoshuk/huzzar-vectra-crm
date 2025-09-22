import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { SlimWarehouseItem } from '@/utils/warehouse'
import { useMemo } from 'react'
import ItemModeTable from './ItemModeTable'
import MaterialHistoryByTabs from './MaterialHistoryByTabs'

type Props = { items: SlimWarehouseItem[] }

/**
 * ItemTabs
 * Splits a homogeneous item list into 4 views:
 * - Warehouse: available, not assigned, not on any order
 * - Technicians: assigned to a technician, not on any order
 * - Orders: assigned to an order
 * - Returned: returned to warehouse or operator
 */
const ItemTabs = ({ items }: Props) => {
  // These derived collections never mutate; memoize for render stability.
  const {
    stockInWarehouse,
    heldByTechnicians,
    assignedToOrders,
    returnedItems,
  } = useMemo(() => {
    const stockInWarehouse = items.filter(
      (i) =>
        i.status === 'AVAILABLE' &&
        i.assignedToId === null &&
        i.orderAssignments.length === 0
    )

    const heldByTechnicians = items.filter(
      (i) =>
        i.status === 'ASSIGNED' &&
        i.assignedToId !== null &&
        i.orderAssignments.length === 0
    )

    const assignedToOrders = items.filter(
      (i) => i.status === 'ASSIGNED_TO_ORDER' && i.orderAssignments.length > 0
    )

    const returnedItems = items.filter(
      (i) => i.status === 'RETURNED' || i.status === 'RETURNED_TO_OPERATOR'
    )

    return {
      stockInWarehouse,
      heldByTechnicians,
      assignedToOrders,
      returnedItems,
    }
  }, [items])

  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="warehouse">Magazyn</TabsTrigger>
        <TabsTrigger value="technicians">Technicy</TabsTrigger>
        <TabsTrigger value="orders">Wydane</TabsTrigger>
        <TabsTrigger value="returned">Zwrócone</TabsTrigger>
      </TabsList>

      <TabsContent value="warehouse">
        {stockInWarehouse[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs
            name={stockInWarehouse[0].name}
            type="warehouse"
          />
        ) : (
          <ItemModeTable items={stockInWarehouse} mode="warehouse" />
        )}
      </TabsContent>

      <TabsContent value="technicians">
        {heldByTechnicians[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs
            name={heldByTechnicians[0].name}
            type="technicians"
          />
        ) : (
          <ItemModeTable items={heldByTechnicians} mode="technicians" />
        )}
      </TabsContent>

      <TabsContent value="orders">
        {assignedToOrders[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs
            name={assignedToOrders[0].name}
            type="orders"
          />
        ) : (
          <ItemModeTable items={assignedToOrders} mode="orders" />
        )}
      </TabsContent>

      <TabsContent value="returned">
        {returnedItems[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs name={returnedItems[0].name} type="returned" />
        ) : (
          <ItemModeTable items={returnedItems} mode="returned" />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default ItemTabs
