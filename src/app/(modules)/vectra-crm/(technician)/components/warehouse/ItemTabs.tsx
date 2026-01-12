'use client'

/* ------------------------------------------------------------------
 * ItemTabs – technician view (devices & materials)
 * ------------------------------------------------------------------
 *  • Magazyn      – current stock of the logged-in technician
 *  • Wydane       – items issued to technician’s orders
 *  • Przekazane   – history of transfers (for materials)
 * ----------------------------------------------------------------*/

import { SlimWarehouseItem } from '@/app/(modules)/vectra-crm/utils/warehouse'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import MaterialHistoryByTabs from './details/MaterialHistoryByTabs'
import TechItemTable from './details/TechItemTable'

type Props = { items: SlimWarehouseItem[] }

const ItemTabs = ({ items }: Props) => {
  const { data: session } = useSession()
  const techId = session?.user.id ?? null

  /* ---------------- partition ---------------- */
  const { warehouseStock, issuedStock, transferredStock } = useMemo(() => {
    if (!techId) {
      return {
        warehouseStock: [] as SlimWarehouseItem[],
        issuedStock: [] as SlimWarehouseItem[],
        transferredStock: [] as SlimWarehouseItem[],
      }
    }

    const warehouseStock: SlimWarehouseItem[] = []
    const issuedStock: SlimWarehouseItem[] = []
    const transferredStock: SlimWarehouseItem[] = []

    items.forEach((item) => {
      if (
        item.assignedToId === techId &&
        item.orderAssignments.length === 0 &&
        item.status !== 'RETURNED_TO_OPERATOR' &&
        !item.transferPending
      ) {
        warehouseStock.push(item)
      } else if (item.orderAssignments.length > 0) {
        issuedStock.push(item)
      } else if (item.status === 'TRANSFER') {
        transferredStock.push(item)
      }
    })

    return { warehouseStock, issuedStock, transferredStock }
  }, [items, techId])

  /* ---------------- helpers ---------------- */
  if (!techId || items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Brak danych o tym elemencie.
      </p>
    )
  }

  const first = items[0]
  const isMaterial = first.itemType === 'MATERIAL'

  const tabs = isMaterial
    ? ([
        { key: 'warehouse', label: 'Magazyn' },
        { key: 'transfer', label: 'Przekazane' },
        { key: 'orders', label: 'Wydane' },
      ] as const)
    : ([
        { key: 'warehouse', label: 'Magazyn' },
        { key: 'orders', label: 'Wydane' },
      ] as const)

  const renderTab = (key: (typeof tabs)[number]['key']) => {
    if (isMaterial) {
      return <MaterialHistoryByTabs name={first.name} tab={key} />
    }
    switch (key) {
      case 'warehouse':
        return <TechItemTable items={warehouseStock} mode="warehouse" />
      case 'orders':
        return <TechItemTable items={issuedStock} mode="orders" />
      case 'transfer':
        return <TechItemTable items={transferredStock} mode="transfer" />
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList
        className={
          isMaterial ? 'grid w-full grid-cols-3' : 'grid w-full grid-cols-2'
        }
      >
        {tabs.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(({ key }) => (
        <TabsContent key={key} value={key} className="mt-2">
          {renderTab(key)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default ItemTabs
