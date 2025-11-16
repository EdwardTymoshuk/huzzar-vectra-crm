'use client'

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { SlimWarehouseItem } from '@/utils/warehouse'
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
 * - Shows item KPIs for both DEVICE and MATERIAL.
 * - Works even if warehouse has 0 actual items (definitions page).
 */
const ItemHeader = ({ items, definition, activeLocationId = 'all' }: Props) => {
  const isDevice = definition.itemType === 'DEVICE'

  // Filter by location
  const filtered = useMemo(() => {
    if (activeLocationId === 'all') return items
    return items.filter((i) => i.location?.id === activeLocationId)
  }, [items, activeLocationId])

  // KPI splits
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

  const sum = (arr: number[]) => arr.reduce((acc, n) => acc + n, 0)

  // Quantities (fallback to 0 if no items)
  const warehouseQty = isDevice
    ? stockInWarehouse.length
    : sum(stockInWarehouse.map((i) => i.quantity))

  const technicianQty = isDevice
    ? heldByTechnicians.length
    : sum(heldByTechnicians.map((i) => i.quantity))

  const totalAvailable = warehouseQty + technicianQty

  const usedInOrders = isDevice
    ? assignedToOrders.length
    : sum(assignedToOrders.map((i) => i.quantity))

  // Monetary for materials only
  const warehouseValue = !isDevice
    ? stockInWarehouse.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined

  const technicianValue = !isDevice
    ? heldByTechnicians.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined

  // Per location breakdown
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
