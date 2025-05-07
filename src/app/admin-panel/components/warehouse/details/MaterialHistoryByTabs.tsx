'use client'

import { Skeleton } from '@/app/components/ui/skeleton'
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'
import ItemHistoryList from './ItemHistoryList'

type Props = {
  name: string
  type: 'warehouse' | 'technicians' | 'orders'
}

/**
 * MaterialHistoryByTabs (single content):
 * - Renders filtered material history depending on tab context.
 */
const MaterialHistoryByTabs = ({ name, type }: Props) => {
  const { data, isLoading } = trpc.warehouse.getHistoryByName.useQuery({ name })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: WarehouseHistoryWithUser[] = []

  if (type === 'warehouse') {
    filtered = data.filter((h) => !h.assignedToId && h.action === 'RECEIVED')
  } else if (type === 'technicians') {
    filtered = data.filter((h) => h.assignedToId && !h.assignedOrderId)
  } else if (type === 'orders') {
    filtered = data.filter((h) => h.assignedOrderId !== null)
  }

  return <ItemHistoryList name={name} dataOverride={filtered} />
}

export default MaterialHistoryByTabs
