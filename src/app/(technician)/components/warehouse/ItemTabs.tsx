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
 *  • Magazyn   – current stock held by *this* technician
 *  • Wydane    – items the technician attached to orders
 *  • Zwrócone  – items the technician returned to operator
 * ----------------------------------------------------------------*/
const ItemTabs = ({ items }: Props) => {
  /* session hook (must run on every render) */
  const { data: session } = useSession()
  const techId = session?.user.id ?? null

  /* ---------------- partition ---------------- */
  const { mine, issued, returned } = useMemo(() => {
    if (!techId) return { mine: [], issued: [], returned: [] }

    const mineArr: WarehouseWithRelations[] = []
    const issuedArr: WarehouseWithRelations[] = []
    const returnedArr: WarehouseWithRelations[] = []

    items.forEach((it) => {
      if (
        it.assignedToId === techId &&
        it.orderAssignments.length === 0 &&
        it.status !== 'RETURNED_TO_OPERATOR'
      ) {
        mineArr.push(it)
      } else if (it.orderAssignments.length > 0) {
        issuedArr.push(it)
      } else if (it.status === 'RETURNED_TO_OPERATOR') {
        returnedArr.push(it)
      }
    })

    return { mine: mineArr, issued: issuedArr, returned: returnedArr }
  }, [items, techId])

  /* ---------------- helpers ---------------- */
  const first = items[0]
  const isMaterial = first?.itemType === 'MATERIAL'

  const tabs: { key: 'warehouse' | 'orders' | 'returned'; label: string }[] = [
    { key: 'warehouse', label: 'Magazyn' },
    { key: 'orders', label: 'Wydane' },
    { key: 'returned', label: 'Zwrócone' },
  ]

  const renderTab = (key: (typeof tabs)[number]['key']) => {
    if (isMaterial) return <MaterialHistoryByTabs name={first.name} tab={key} />

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
  const noData = !techId || items.length === 0

  if (noData)
    return (
      <p className="text-center text-muted-foreground py-8">
        Brak danych o tym elemencie.
      </p>
    )

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
          {renderTab(key)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default ItemTabs
