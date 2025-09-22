'use client'

/* ---------------------------------------------------------------------
 * ItemHeaderTech
 * Technician panel header – shows only the logged-in technician’s stock.
 * Displays:
 * - personal warehouse (“Stan magazynowy”)
 * - number of items already used/issued on orders
 * ------------------------------------------------------------------- */

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { SlimWarehouseItem } from '@/utils/warehouse'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

type Props = { items: SlimWarehouseItem[] }

const ItemHeaderTech = ({ items }: Props) => {
  const { data: session } = useSession()
  const techId = session?.user.id

  // memoize subsets regardless of conditions
  const { mine, issued } = useMemo(() => {
    if (!techId)
      return {
        mine: [] as SlimWarehouseItem[],
        issued: [] as SlimWarehouseItem[],
      }

    return {
      mine: items.filter(
        (i) => i.assignedToId === techId && i.orderAssignments.length === 0
      ),
      issued: items.filter(
        (i) => i.assignedToId === techId && i.orderAssignments.length > 0
      ),
    }
  }, [items, techId])

  // if no data → nothing to render
  if (!items.length || !techId) return null

  const first = items[0]
  const isDevice = first.itemType === 'DEVICE'

  /* ---- counts ---- */
  const myQty = isDevice
    ? mine.length
    : mine.reduce((s, i) => s + i.quantity, 0)

  const usedQty = isDevice
    ? issued.length
    : issued.reduce((s, i) => s + i.quantity, 0)

  const myVal = !isDevice
    ? mine.reduce((s, i) => s + i.quantity * (i.price ?? 0), 0)
    : undefined

  return (
    <ItemStatsCard
      name={first.name}
      categoryOrIndex={
        isDevice
          ? devicesTypeMap[first.category ?? ''] ?? '—'
          : first.index ?? '—'
      }
      price={first.price?.toFixed(2) ?? '—'}
      isDevice={isDevice}
      warehouseQty={myQty}
      warehouseValue={myVal}
      usedInOrders={usedQty}
      showWarehouse
      showTechnician={false}
    />
  )
}

export default ItemHeaderTech
