'use client'

/* ---------------------------------------------------------------------
 * ItemHeaderAdmin
 * Container for admin panel – aggregates global statistics and passes
 * them to ItemStatsCard.  Admin sees both warehouse and technicians data.
 * ------------------------------------------------------------------- */

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { WarehouseWithRelations } from '@/types'
import { Warehouse } from '@prisma/client'
import { useEffect, useState } from 'react'

type Props = { items: WarehouseWithRelations[] }

const ItemHeader = ({ items }: Props) => {
  const [first, setFirst] = useState<Warehouse | null>(null)
  useEffect(() => setFirst(items[0]), [items])
  if (!first) return null

  const isDevice = first.itemType === 'DEVICE'

  /* ---- dataset partitions ---- */
  const warehouse = items.filter(
    (i) =>
      i.status === 'AVAILABLE' &&
      !i.assignedToId &&
      i.orderAssignments.length === 0
  )
  const technicians = items.filter(
    (i) => i.status === 'ASSIGNED' && i.orderAssignments.length === 0
  )
  const issued = items.filter((i) => i.orderAssignments.length > 0)

  /* ---- aggregates ---- */
  const whQty = isDevice
    ? warehouse.length
    : warehouse.reduce((s, i) => s + i.quantity, 0)
  const techQty = isDevice
    ? technicians.length
    : technicians.reduce((s, i) => s + i.quantity, 0)
  const usedQty = isDevice
    ? issued.length
    : issued.reduce((s, i) => s + i.quantity, 0)

  const whVal = !isDevice
    ? warehouse.reduce((s, i) => s + i.quantity * (i.price ?? 0), 0)
    : undefined
  const techVal = !isDevice
    ? technicians.reduce((s, i) => s + i.quantity * (i.price ?? 0), 0)
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
      /* stock blocks */
      warehouseQty={whQty}
      warehouseValue={whVal}
      technicianQty={techQty}
      technicianValue={techVal}
      technicianLabel="Stan techników"
      /* other */
      usedInOrders={usedQty}
      showWarehouse
      showTechnician
    />
  )
}

export default ItemHeader
