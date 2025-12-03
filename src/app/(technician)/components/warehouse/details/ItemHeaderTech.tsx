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
import { WarehouseAction } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

type Props = { items: SlimWarehouseItem[] }

const ItemHeaderTech = ({ items }: Props) => {
  const { data: session } = useSession()
  const techId = session?.user.id

  const first = items[0]
  const isDevice = first.itemType === 'DEVICE'

  /** ------------------------------------------------------------------
   * 1) Split: what is still on technician stock (mine)
   * ------------------------------------------------------------------ */
  const mine = useMemo(
    () =>
      items.filter(
        (i) => i.assignedToId === techId && i.orderAssignments.length === 0
      ),
    [items, techId]
  )

  /** ------------------------------------------------------------------
   * 2) Quantities on tech stock
   * ------------------------------------------------------------------ */
  const myQty = useMemo(
    () =>
      isDevice ? mine.length : mine.reduce((sum, i) => sum + i.quantity, 0),
    [isDevice, mine]
  )

  const myVal = useMemo(
    () =>
      !isDevice
        ? mine.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0)
        : undefined,
    [isDevice, mine]
  )

  /** ------------------------------------------------------------------
   * 3) How much technician already used on orders
   *    - DEVICES: count devices that have ASSIGNED_TO_ORDER event by this tech
   *    - MATERIALS: sum ISSUED quantities with assignedOrderId and performedBy = tech
   * ------------------------------------------------------------------ */
  const usedQty = useMemo(() => {
    if (!techId) return 0

    if (isDevice) {
      // Each device counted once if technician assigned it to at least one order
      return items.reduce((total, item) => {
        const hasUsedOnOrder = item.history.some(
          (h) =>
            h.action === WarehouseAction.ASSIGNED_TO_ORDER &&
            h.assignedOrderId !== null &&
            h.performedBy?.id === techId
        )

        return total + (hasUsedOnOrder ? 1 : 0)
      }, 0)
    }

    // MATERIAL: sum all ISSUED quantities that went to orders, performed by this tech
    return items.reduce((total, item) => {
      const usedForOrders = item.history
        .filter(
          (h) =>
            h.action === WarehouseAction.ASSIGNED_TO_ORDER ||
            (h.action === WarehouseAction.ISSUED &&
              h.assignedOrderId !== null &&
              h.performedBy?.id === techId &&
              (h.quantity ?? 0) > 0)
        )
        .reduce((sum, h) => sum + (h.quantity ?? 0), 0)

      return total + usedForOrders
    }, 0)
  }, [items, isDevice, techId])

  // If there is no technician or no items, do not render header
  if (!items.length || !techId) return null

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
