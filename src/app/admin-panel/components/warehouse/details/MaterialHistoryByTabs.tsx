'use client'

import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'
import ItemHistoryList from './ItemHistoryList'

type Props = {
  name: string
  type: 'warehouse' | 'technicians' | 'orders' | 'returned'
}

/**
 * MaterialHistoryByTabs (single content):
 * - Renders filtered material history depending on tab context.
 */
const MaterialHistoryByTabs = ({ name, type }: Props) => {
  const { data, isLoading } = trpc.warehouse.getHistoryByName.useQuery({ name })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryWithUser[] = []

  switch (type) {
    case 'warehouse':
      filtered = data.filter((h) => h.action === 'RECEIVED')
      break
    case 'technicians':
      filtered = data.filter((h) => h.assignedToId && !h.assignedOrderId)
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
