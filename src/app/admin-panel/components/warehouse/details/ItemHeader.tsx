'use client'

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { SlimWarehouseItem } from '@/utils/warehouse'
import { useMemo } from 'react'

type Props = {
  items: SlimWarehouseItem[]
  activeLocationId?: 'all' | string
}

/**
 * ItemHeader
 * - Shows main KPIs (warehouse/technicians/orders), respecting activeLocationId.
 * - Provides optional per-location breakdown as subpoints in ItemStatsCard.
 */
const ItemHeader = ({ items, activeLocationId = 'all' }: Props) => {
  // Filter items by selected location for main KPIs
  const filtered = useMemo(() => {
    if (!items.length) return []
    if (activeLocationId === 'all') return items
    return items.filter((i) => i.location?.id === activeLocationId)
  }, [items, activeLocationId])

  // Detect first element and item type
  const first = items[0]
  const isDevice = first?.itemType === 'DEVICE'

  const sum = (arr: number[]) => arr.reduce((acc, n) => acc + n, 0)
  const money = (n: number | undefined) =>
    typeof n === 'number' ? n.toFixed(2) : '—'

  // Split filtered items
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

  // KPI numbers
  const warehouseQty = isDevice
    ? stockInWarehouse.length
    : sum(stockInWarehouse.map((i) => i.quantity))

  const technicianQty = isDevice
    ? heldByTechnicians.length
    : sum(heldByTechnicians.map((i) => i.quantity))

  const usedInOrders = isDevice
    ? assignedToOrders.length
    : sum(assignedToOrders.map((i) => i.quantity))

  // Monetary totals for MATERIAL
  const warehouseValue = !isDevice
    ? stockInWarehouse.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined
  const technicianValue = !isDevice
    ? heldByTechnicians.reduce((acc, i) => acc + i.quantity * (i.price ?? 0), 0)
    : undefined

  // Breakdown per location (on ALL items, not filtered)
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

  // Early return after all hooks
  if (!first) return null

  return (
    <ItemStatsCard
      name={first.name}
      categoryOrIndex={
        isDevice
          ? devicesTypeMap[first.category ?? ''] ?? '—'
          : first.index ?? '—'
      }
      price={money(first.price)}
      isDevice={isDevice}
      warehouseQty={warehouseQty}
      warehouseValue={warehouseValue}
      warehouseByLocation={byLocation}
      technicianQty={technicianQty}
      technicianValue={technicianValue}
      technicianLabel="Stan techników"
      usedInOrders={usedInOrders}
      showWarehouse
      showTechnician
    />
  )
}

export default ItemHeader
