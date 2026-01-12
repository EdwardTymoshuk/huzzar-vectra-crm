'use client'

import ItemHistoryList from '@/app/(modules)/vectra-crm/components/warehouse/ItemHistoryList'
import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryRowVM } from '@/types/vectra-crm'
import { trpc } from '@/utils/trpc'

type Props = {
  name: string
  tab: 'warehouse' | 'orders' | 'returned' | 'transfer'
}

const MaterialHistoryByTabs = ({ name, tab }: Props) => {
  const { data, isLoading } = trpc.vectra.warehouse.getHistoryByName.useQuery({
    name,
    // scope: 'technician',
  })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryRowVM[] = []

  switch (tab) {
    case 'warehouse':
      filtered = data.filter((h) => {
        const isPersonalStockChange =
          h.assignedOrderId === null &&
          (h.action === 'ISSUED' ||
            h.action === 'RETURNED' ||
            h.action === 'RETURNED_TO_TECHNICIAN')

        return isPersonalStockChange
      })
      break

    case 'orders':
      filtered = data.filter(
        (h) =>
          h.action === 'ASSIGNED_TO_ORDER' ||
          (h.action === 'ISSUED' && h.assignedOrderId !== null)
      )
      break

    case 'returned':
      filtered = data.filter((h) => h.action === 'RETURNED_TO_OPERATOR')
      break

    case 'transfer':
      // Przekazanie innemu technikowi
      filtered = data.filter((h) => h.action === 'TRANSFER')
      break
  }

  // Sortowanie od najnowszych
  const sorted = filtered.sort(
    (a, b) =>
      new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()
  )

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak historii w tej zakładce.
      </p>
    )
  }

  return (
    <ItemHistoryList
      name={name}
      dataOverride={sorted}
      context={
        tab === 'orders'
          ? 'orders'
          : tab === 'returned'
          ? 'returned'
          : 'warehouse'
      }
    />
  )
}

export default MaterialHistoryByTabs
