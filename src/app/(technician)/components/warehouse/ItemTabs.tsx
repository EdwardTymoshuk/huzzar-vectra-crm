'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { WarehouseWithRelations } from '@/types'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import MaterialHistoryByTabs from './details/MaterialHistoryByTabs'
import TechItemAccordion from './details/TechItemAccordion'

type Props = { items: WarehouseWithRelations[] }

/* ------------------------------------------------------------------
 * ItemTabs – technician view
 * ------------------------------------------------------------------
 *  • Warehouse (Magazyn)  – current stock held by *this* technician
 *  • Orders    (Wydane)   – items the technician attached to orders
 *  • Returned  (Zwrócone) – items the technician returned to operator
 * ----------------------------------------------------------------*/
const ItemTabs = ({ items }: Props) => {
  /* ---------- guard ---------- */
  const { data: session } = useSession()
  const techId = session?.user.id

  if (!techId || items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Brak danych o tym elemencie.
      </p>
    )
  }

  /* ---------- partition from technician POV ---------- */
  const { mine, issued, returned } = useMemo(() => {
    const mineArr: WarehouseWithRelations[] = []
    const issuedArr: WarehouseWithRelations[] = []
    const returnedArr: WarehouseWithRelations[] = []

    for (const it of items) {
      /* technician’s own stock (not on an order) */
      if (
        it.assignedToId === techId &&
        it.orderAssignments.length === 0 &&
        it.status !== 'RETURNED_TO_OPERATOR'
      ) {
        mineArr.push(it)
        continue
      }

      /* attached to orders */
      if (it.orderAssignments.length > 0) {
        issuedArr.push(it)
        continue
      }

      /* returns to operator */
      if (it.status === 'RETURNED_TO_OPERATOR') {
        returnedArr.push(it)
      }
    }

    return { mine: mineArr, issued: issuedArr, returned: returnedArr }
  }, [items, techId])

  /* ---------- misc helpers ---------- */
  const first = items[0]
  const isMaterial = first.itemType === 'MATERIAL'

  const tabs: { key: 'warehouse' | 'orders' | 'returned'; label: string }[] = [
    { key: 'warehouse', label: 'Magazyn' },
    { key: 'orders', label: 'Wydane' },
    { key: 'returned', label: 'Zwrócone' },
  ]

  const render = (key: (typeof tabs)[number]['key']) => {
    if (isMaterial) {
      return <MaterialHistoryByTabs name={first.name} tab={key} />
    }

    switch (key) {
      case 'warehouse':
        return <TechItemAccordion items={mine} />
      case 'orders':
        return <TechItemAccordion items={issued} />
      case 'returned':
        return <TechItemAccordion items={returned} />
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {tabs.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(({ key }) => (
        <TabsContent key={key} value={key}>
          {render(key)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default ItemTabs
