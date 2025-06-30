'use client'

/* ---------------------------------------------------------------------
 * ItemHeaderTech
 * Container for technician panel – shows ONLY the logged-in
 * technician’s own stock (“Stan magazynowy”) and items issued
 * on his orders.  The global technicians block is hidden.
 * ------------------------------------------------------------------- */

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { WarehouseWithRelations } from '@/types'
import { Warehouse } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

type Props = { items: WarehouseWithRelations[] }

const ItemHeaderTech = ({ items }: Props) => {
  const { data: session } = useSession()
  const techId = session?.user.id
  const [first, setFirst] = useState<Warehouse | null>(null)
  useEffect(() => setFirst(items[0]), [items])
  if (!first || !techId) return null

  const isDevice = first.itemType === 'DEVICE'

  /* ---- subsets for current technician ---- */
  const mine = items.filter(
    (i) => i.assignedToId === techId && i.orderAssignments.length === 0
  )
  const issued = items.filter(
    (i) => i.assignedToId === techId && i.orderAssignments.length > 0
  )

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
      /* personal warehouse as “Stan magazynowy” */
      warehouseQty={myQty}
      warehouseValue={myVal}
      /* orders */
      usedInOrders={usedQty}
      showWarehouse /* show personal stock */
      showTechnician={false} /* hide global technicians block */
    />
  )
}

export default ItemHeaderTech
