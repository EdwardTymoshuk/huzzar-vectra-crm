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
  activeLocationId?: 'all' | string
}

const ItemTabs = ({ items, activeLocationId = 'all' }: Props) => {
  const locFiltered = useMemo(() => {
    if (activeLocationId === 'all') return items

    return items.filter((i) => {
      if (i.status === 'ASSIGNED' && i.assignedToId) return true
      if (i.status === 'COLLECTED_FROM_CLIENT') return true
      if (i.status === 'RETURNED_TO_OPERATOR') return true
      if (i.orderAssignments.length > 0) return true
      if (i.status === 'AVAILABLE') {
        return i.location?.id === activeLocationId
      }

      return false
    })
  }, [items, activeLocationId])

  const { stockInWarehouse, heldByTechnicians, usedInOrders, returnedItems } =
    useMemo(() => {
      const stockInWarehouse = locFiltered.filter((i) => {
        return (
          i.status === 'AVAILABLE' &&
          !i.assignedToId &&
          i.orderAssignments.length === 0
        )
      })

      const heldByTechnicians = locFiltered.filter((i) => {
        return (
          i.status === 'ASSIGNED' &&
          i.assignedToId &&
          i.orderAssignments.length === 0
        )
      })

      const usedInOrders = locFiltered.filter((i) => {
        return i.orderAssignments.length > 0 || i.status === 'ASSIGNED_TO_ORDER'
      })

      const returnedItems = locFiltered.filter((i) => {
        return i.status === 'RETURNED' || i.status === 'RETURNED_TO_OPERATOR'
      })

      return {
        stockInWarehouse,
        heldByTechnicians,
        usedInOrders,
        returnedItems,
      }
    }, [locFiltered])

  const isMaterial = items.length > 0 && items[0].itemType === 'MATERIAL'
  const name = items[0]?.name || ''

  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-2">
        <TabsTrigger value="warehouse">Magazyn</TabsTrigger>
        <TabsTrigger value="technicians">Technicy</TabsTrigger>
        <TabsTrigger value="orders">Wydane</TabsTrigger>
        <TabsTrigger value="returned">Zwrócone</TabsTrigger>
      </TabsList>

      <TabsContent value="warehouse">
        {isMaterial ? (
          <MaterialHistoryByTabs name={name} type="warehouse" />
        ) : (
          <ItemModeTable items={stockInWarehouse} mode="warehouse" />
        )}
      </TabsContent>

      <TabsContent value="technicians">
        {isMaterial ? (
          <MaterialHistoryByTabs name={name} type="technicians" />
        ) : (
          <ItemModeTable items={heldByTechnicians} mode="technicians" />
        )}
      </TabsContent>

      <TabsContent value="orders">
        {isMaterial ? (
          <MaterialHistoryByTabs name={name} type="orders" />
        ) : (
          <ItemModeTable items={usedInOrders} mode="orders" />
        )}
      </TabsContent>

      <TabsContent value="returned">
        {isMaterial ? (
          <MaterialHistoryByTabs name={name} type="returned" />
        ) : (
          <ItemModeTable items={returnedItems} mode="returned" />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default ItemTabs
