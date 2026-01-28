// src/app/admin-panel/components/warehouse/details/OplMaterialHistoryByTabs.tsx
'use client'

import { Skeleton } from '@/app/components/ui/skeleton'
import { OplWarehouseHistoryRowVM } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import OplItemHistoryList from './OplItemHistoryList'

type Props = {
  name: string
  type: 'warehouse' | 'technicians' | 'orders' | 'returned'
}

const OplMaterialHistoryByTabs = ({ name, type }: Props) => {
  const { data, isLoading } = trpc.opl.warehouse.getOplHistoryByName.useQuery({
    name,
  })

  if (isLoading || !data) return <Skeleton className="h-32 w-full" />

  let filtered: OplWarehouseHistoryRowVM[] = []

  switch (type) {
    case 'warehouse':
      filtered = data.filter((h) => {
        const isMainStock = h.assignedTo === null && h.assignedOrderId === null
        return (
          isMainStock && ['RECEIVED', 'ISSUED', 'RETURNED'].includes(h.action)
        )
      })
      break

    case 'technicians':
      filtered = data.filter(
        (h) =>
          h.action === 'ISSUED' &&
          h.assignedTo !== null &&
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

  return (
    <OplItemHistoryList name={name} dataOverride={filtered} context={type} />
  )
}

export default OplMaterialHistoryByTabs
