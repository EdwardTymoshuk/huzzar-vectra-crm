'use client'

import { SlimWarehouseItem } from '@/app/(modules)/vectra-crm/utils/warehouse'
import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { useMemo } from 'react'

type Props = {
  items: SlimWarehouseItem[] // actual warehouse stock (possibly empty)
  definition: {
    name: string
    category: string | null
    index?: string | null
    price: number | null
    itemType: 'DEVICE' | 'MATERIAL'
  }
  activeLocationId?: 'all' | string
}

/**
 * ItemHeader
 * --------------------------------------------------------------------
 * Displays KPI stats for both DEVICE and MATERIAL:
 *  - quantity in warehouse
 *  - quantity on technicians
 *  - quantity used/assigned on orders
 * For devices "usedInOrders" = devices currently assigned to orders.
 * For materials "usedInOrders" = total quantity issued to orders
 *   (based on history entries with action=ISSUED & assignedOrderId != null).
 */
const ItemHeader = ({ items, definition, activeLocationId = 'all' }: Props) => {
  const isDevice = definition.itemType === 'DEVICE'

  // Filter by location
  const filtered = useMemo(() => {
    if (activeLocationId === 'all') return items
    return items.filter((i) => i.location?.id === activeLocationId)
  }, [items, activeLocationId])

  // KPI splits for current stock
  const { stockInWarehouse, heldByTechnicians, assignedToOrders } =
    useMemo(() => {
      const stockInWarehouse = filtered.filter(
        (i) =>
          i.status === 'AVAILABLE' &&
          i.assignedToId === null &&
          i.orderAssignments.length === 0
      )

      const heldByTechnicians = filtered.filter(
        (i) =>
          i.status === 'ASSIGNED' &&
          i.assignedToId !== null &&
          i.orderAssignments.length === 0
      )

      const assignedToOrders = filtered.filter(
        (i) => i.status === 'ASSIGNED_TO_ORDER' && i.orderAssignments.length > 0
      )

      return { stockInWarehouse, heldByTechnicians, assignedToOrders }
    }, [filtered])

  const sum = (arr: number[]): number => arr.reduce((acc, n) => acc + n, 0)

  // Quantities for current stock
  const warehouseQty = isDevice
    ? stockInWarehouse.length
    : sum(stockInWarehouse.map((i) => i.quantity))

  const technicianQty = isDevice
    ? heldByTechnicians.length
    : sum(heldByTechnicians.map((i) => i.quantity))

  const totalAvailable = warehouseQty + technicianQty

  // Used / assigned on orders
  const usedInOrders = useMemo(() => {
    // For devices: currently assigned pieces
    if (isDevice) {
      return assignedToOrders.length
    }

    // For materials: sum all ISSUED entries with assignedOrderId
    // across all items of this definition.
    return items.reduce((acc, item) => {
      const issuedToOrders = item.history
        .filter(
          (h) =>
            h.action === 'ISSUED' &&
            h.assignedOrderId !== null &&
            (h.quantity ?? 0) > 0
        )
        .reduce((sumQty, h) => sumQty + (h.quantity ?? 0), 0)

      return acc + issuedToOrders
    }, 0)
  }, [isDevice, assignedToOrders, items])

  // Monetary for materials only
  const warehouseValue = !isDevice
    ? stockInWarehouse.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined

  const technicianValue = !isDevice
    ? heldByTechnicians.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined

  // Per location breakdown (warehouse stock only)
  const byLocation = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>()
    for (const it of items) {
      const id = it.location?.id ?? 'unknown'
      const name = it.location?.name ?? '—'

      const inWarehouse =
        it.status === 'AVAILABLE' &&
        it.assignedToId === null &&
        it.orderAssignments.length === 0

      if (!inWarehouse) continue

      const current = map.get(id) ?? { name, qty: 0 }
      current.qty += isDevice ? 1 : it.quantity
      map.set(id, current)
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }))
  }, [items, isDevice])

  return (
    <ItemStatsCard
      name={definition.name}
      categoryOrIndex={
        isDevice
          ? devicesTypeMap[definition.category ?? ''] ?? '—'
          : definition.index ?? '—'
      }
      price={(definition.price ?? 0).toFixed(2)}
      isDevice={isDevice}
      warehouseQty={warehouseQty}
      warehouseValue={warehouseValue}
      warehouseByLocation={byLocation}
      technicianQty={technicianQty}
      technicianValue={technicianValue}
      technicianLabel="Stan techników"
      usedInOrders={usedInOrders}
      totalAvailable={totalAvailable}
      showWarehouse
      showTechnician
    />
  )
}

export default ItemHeader
