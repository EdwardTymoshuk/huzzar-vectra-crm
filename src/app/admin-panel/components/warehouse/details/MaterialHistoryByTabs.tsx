// src/app/admin-panel/components/warehouse/details/MaterialHistoryByTabs.tsx

'use client'

import ItemHistoryList from '@/app/components/shared/warehouse/ItemHistoryList'
import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'

type Props = {
  name: string
  type: 'warehouse' | 'technicians' | 'orders' | 'returned'
}

const MaterialHistoryByTabs = ({ name, type }: Props) => {
  const { data, isLoading } = trpc.warehouse.getHistoryByName.useQuery({ name })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryWithUser[] = []

  switch (type) {
    case 'warehouse':
      // Wszystkie operacje na puli magazynowej (głównej)
      filtered = data.filter((h) => {
        const isMainStock =
          h.assignedToId === null && h.assignedOrderId === null
        return (
          isMainStock && ['RECEIVED', 'ISSUED', 'RETURNED'].includes(h.action)
        )
      })
      break

    case 'technicians':
      filtered = data.filter(
        (h) =>
          h.action === 'ISSUED' &&
          h.assignedToId !== null &&
          h.assignedOrderId === null
      )
      break

    case 'orders':
      filtered = data.filter(
        (h) =>
          h.action === 'ASSIGNED_TO_ORDER' ||
          (h.action === 'ISSUED' && h.assignedOrderId !== null)
      )
      break

    case 'returned':
      filtered = data.filter((h) =>
        ['RETURNED', 'RETURNED_TO_OPERATOR', 'RETURNED_TO_TECHNICIAN'].includes(
          h.action
        )
      )
      break
  }

  // Sortuj od najnowszych
  filtered = filtered.sort(
    (a, b) =>
      new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()
  )

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak historii w tej zakładce.
      </p>
    )
  }

  return <ItemHistoryList name={name} dataOverride={filtered} context={type} />
}

export default MaterialHistoryByTabs
