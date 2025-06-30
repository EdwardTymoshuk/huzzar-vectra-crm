'use client'

/* ---------------------------------------------------------------------
 * MaterialHistoryByTabs (technician view)
 * ---------------------------------------
 * Requests history already limited to the logged-in technician
 *   – back-end filter:  performedById === ctx.user.id
 *                       OR assignedToId === ctx.user.id
 *
 * Additional client-side filtering per tab:
 *   • 'warehouse' – entries that INCREASE technician stock   (ISSUED)
 *   • 'orders'    – entries assigned to technician’s orders  (assignedOrderId)
 *   • 'returned'  – returns to operator                      (RETURNED_TO_OPERATOR)
 * ------------------------------------------------------------------- */

import ItemHistoryList from '@/app/components/shared/warehouse/ItemHistoryList'
import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'

type Props = {
  name: string
  tab: 'warehouse' | 'orders' | 'returned'
}

const MaterialHistoryByTabs = ({ name, tab }: Props) => {
  /* fetch rows bound to the current technician */
  const { data, isLoading } = trpc.warehouse.getHistoryByName.useQuery({
    name,
    scope: 'technician',
  })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryWithUser[] = []

  switch (tab) {
    case 'warehouse':
      filtered = data.filter(
        (h) => h.action === 'ISSUED' && h.assignedOrderId === null
      )
      break

    case 'orders':
      filtered = data.filter((h) => h.assignedOrderId !== null)
      break

    case 'returned':
      filtered = data.filter((h) => h.action === 'RETURNED_TO_OPERATOR')
      break
  }

  return <ItemHistoryList name={name} dataOverride={filtered} />
}

export default MaterialHistoryByTabs
