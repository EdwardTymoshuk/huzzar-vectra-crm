'use client'

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

type Props = {
  items: SlimWarehouseItem[]
  activeLocationId?: 'all' | string // ✅ optional filter
}

/**
 * ItemTabs
 * - Applies location filter to items.
 * - Splits a homogeneous item list into 4 views:
 *   warehouse / technicians / orders / returned
 */
const ItemTabs = ({ items, activeLocationId = 'all' }: Props) => {
  const locFiltered = useMemo(() => {
    if (activeLocationId === 'all') return items

    return items.filter((i) => {
      // Case 1 — assigned to order → always visible regardless of location
      if (i.status === 'ASSIGNED_TO_ORDER') return true

      // Case 2 — normal items → filter by location
      return i.location?.id === activeLocationId
    })
  }, [items, activeLocationId])

  // Derived collections never mutate; memoize for render stability.
  const {
    stockInWarehouse,
    heldByTechnicians,
    assignedToOrders,
    returnedItems,
  } = useMemo(() => {
    const stockInWarehouse = locFiltered.filter(
      (i) =>
        i.status === 'AVAILABLE' &&
        i.assignedToId === null &&
        i.orderAssignments.length === 0
    )
    const heldByTechnicians = locFiltered.filter(
      (i) =>
        i.status === 'ASSIGNED' &&
        i.assignedToId !== null &&
        i.orderAssignments.length === 0
    )
    const assignedToOrders = locFiltered.filter(
      (i) => i.status === 'ASSIGNED_TO_ORDER' && i.orderAssignments.length > 0
    )
    const returnedItems = locFiltered.filter(
      (i) => i.status === 'RETURNED' || i.status === 'RETURNED_TO_OPERATOR'
    )

    return {
      stockInWarehouse,
      heldByTechnicians,
      assignedToOrders,
      returnedItems,
    }
  }, [locFiltered])

  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-2">
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
