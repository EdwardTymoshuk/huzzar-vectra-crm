'use client'

import { OplSlimWarehouseItem } from '@/app/(modules)/opl-crm/utils/warehouse/warehouse'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import OplItemModeTable from './OplItemModeTable'
import OplMaterialHistoryByTabs from './OplMaterialHistoryByTabs'
type Props = {
  items: OplSlimWarehouseItem[]
  activeLocationId?: 'all' | string
}

const ItemTabs = ({ items, activeLocationId = 'all' }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabFromUrl = searchParams.get('itemTab')
  const activeTab =
    tabFromUrl === 'technicians' ||
    tabFromUrl === 'orders' ||
    tabFromUrl === 'returned'
      ? tabFromUrl
      : 'warehouse'

  const setTabInUrl = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'warehouse') {
      params.delete('itemTab')
    } else {
      params.set('itemTab', tab)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

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
    <Tabs
      value={activeTab}
      onValueChange={setTabInUrl}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4 mb-2">
        <TabsTrigger value="warehouse">Magazyn</TabsTrigger>
        <TabsTrigger value="technicians">Technicy</TabsTrigger>
        <TabsTrigger value="orders">Wydane</TabsTrigger>
        <TabsTrigger value="returned">Zwrócone</TabsTrigger>
      </TabsList>

      <TabsContent value="warehouse">
        {isMaterial ? (
          <OplMaterialHistoryByTabs name={name} type="warehouse" />
        ) : (
          <OplItemModeTable items={stockInWarehouse} mode="warehouse" />
        )}
      </TabsContent>

      <TabsContent value="technicians">
        {isMaterial ? (
          <OplMaterialHistoryByTabs name={name} type="technicians" />
        ) : (
          <OplItemModeTable items={heldByTechnicians} mode="technicians" />
        )}
      </TabsContent>

      <TabsContent value="orders">
        {isMaterial ? (
          <OplMaterialHistoryByTabs name={name} type="orders" />
        ) : (
          <OplItemModeTable items={usedInOrders} mode="orders" />
        )}
      </TabsContent>

      <TabsContent value="returned">
        {isMaterial ? (
          <OplMaterialHistoryByTabs name={name} type="returned" />
        ) : (
          <OplItemModeTable items={returnedItems} mode="returned" />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default ItemTabs
