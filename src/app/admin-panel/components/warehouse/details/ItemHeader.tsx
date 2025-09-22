'use client'

import ItemStatsCard from '@/app/components/shared/warehouse/ItemStatsCard'
import { devicesTypeMap } from '@/lib/constants'
import { SlimWarehouseItem } from '@/utils/warehouse'
import { useMemo } from 'react'

type Props = { items: SlimWarehouseItem[] }

/**
 * ItemHeader
 * Aggregated, read-only summary for a homogeneous list of items (same name/category).
 * - Derives everything from props using memoized selectors.
 * - Works for both DEVICE (count-based) and MATERIAL (quantity-based) items.
 */
const ItemHeader = ({ items }: Props) => {
  // Ensure we always have a consistent "first item" reference, or undefined
  const first = items.length > 0 ? items[0] : undefined

  const isDevice = first?.itemType === 'DEVICE'

  // Small helpers for clarity
  const sum = (arr: number[]) => arr.reduce((acc, n) => acc + n, 0)
  const money = (n: number | undefined) =>
    typeof n === 'number' ? n.toFixed(2) : '—'

  /**
   * Derive disjoint subsets of items by status:
   * - stockInWarehouse: available, not assigned, not on any order
   * - heldByTechnicians: assigned to a technician, not on any order
   * - assignedToOrders: assigned to an order
   */
  const { stockInWarehouse, heldByTechnicians, assignedToOrders } =
    useMemo(() => {
      const stockInWarehouse = items.filter(
        (i) =>
          i.status === 'AVAILABLE' &&
          i.assignedToId === null &&
          i.orderAssignments.length === 0
      )

      const heldByTechnicians = items.filter(
        (i) =>
          i.status === 'ASSIGNED' &&
          i.assignedToId !== null &&
          i.orderAssignments.length === 0
      )

      const assignedToOrders = items.filter(
        (i) => i.status === 'ASSIGNED_TO_ORDER' && i.orderAssignments.length > 0
      )

      return { stockInWarehouse, heldByTechnicians, assignedToOrders }
    }, [items])

  /** Aggregate counts/quantities */
  const warehouseQty = useMemo(
    () =>
      isDevice
        ? stockInWarehouse.length
        : sum(stockInWarehouse.map((i) => i.quantity)),
    [isDevice, stockInWarehouse]
  )

  const technicianQty = useMemo(
    () =>
      isDevice
        ? heldByTechnicians.length
        : sum(heldByTechnicians.map((i) => i.quantity)),
    [isDevice, heldByTechnicians]
  )

  const usedInOrders = useMemo(
    () =>
      isDevice
        ? assignedToOrders.length
        : sum(assignedToOrders.map((i) => i.quantity)),
    [isDevice, assignedToOrders]
  )

  /** Monetary totals apply only to MATERIAL */
  const warehouseValue = useMemo(() => {
    if (isDevice) return undefined
    return stockInWarehouse.reduce(
      (acc, i) => acc + i.quantity * (i.price ?? 0),
      0
    )
  }, [isDevice, stockInWarehouse])

  const technicianValue = useMemo(() => {
    if (isDevice) return undefined
    return heldByTechnicians.reduce(
      (acc, i) => acc + i.quantity * (i.price ?? 0),
      0
    )
  }, [isDevice, heldByTechnicians])

  // Final render guard – after all hooks
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
