'use client'

/* ---------------------------------------------------------------------
 * MaterialHistoryByTabs (technician view)
 * ---------------------------------------
 * Back-end zwraca już tylko historię powiązaną z zalogowanym technikiem
 * (performedById === ctx.user.id  OR  assignedToId === ctx.user.id).
 *
 * Filtry klienta:
 *   • 'warehouse' – wpisy zwiększające stan technika   (TRANSFER)
 *   • 'orders'    – wpisy przypisane do zleceń         (assignedOrderId !== null)
 *   • 'returned'  – zwroty do operatora               (RETURNED_TO_OPERATOR)
 *   • 'transfer'  – wszystkie przekazania (TRANSFER)  (dla podglądu historii)
 * ------------------------------------------------------------------- */

import ItemHistoryList from '@/app/components/shared/warehouse/ItemHistoryList'
import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'

type Props = {
  name: string
  tab: 'warehouse' | 'orders' | 'returned' | 'transfer'
}

const MaterialHistoryByTabs = ({ name, tab }: Props) => {
  /* ściągamy historię ograniczoną do bieżącego technika */
  const { data, isLoading } = trpc.warehouse.getHistoryByName.useQuery({
    name,
    scope: 'technician',
  })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryWithUser[] = []

  switch (tab) {
    case 'warehouse':
      filtered = data.filter(
        (h) =>
          (h.action === 'ISSUED' || h.action === 'RECEIVED') &&
          h.assignedOrderId === null
      )
      break

    case 'orders': {
      filtered = data.filter((h) => h.assignedOrderId !== null)
      break
    }

    case 'returned': {
      filtered = data.filter((h) => h.action === 'RETURNED_TO_OPERATOR')
      break
    }

    case 'transfer': {
      filtered = data.filter((h) => h.action === 'TRANSFER')
      break
    }
  }

  return <ItemHistoryList name={name} dataOverride={filtered} />
}

export default MaterialHistoryByTabs
