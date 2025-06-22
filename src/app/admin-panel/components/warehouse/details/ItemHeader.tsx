'use client'

import { Card } from '@/app/components/ui/card'
import { devicesTypeMap } from '@/lib/constants'
import { WarehouseWithRelations } from '@/types'
import { Warehouse } from '@prisma/client'
import { useEffect, useState } from 'react'

type Props = {
  items: WarehouseWithRelations[]
}

/**
 * ItemHeader:
 * - Displays summary info about a specific warehouse item.
 * - Handles both DEVICE and MATERIAL types.
 * - Shows warehouse/technician stock, total used in orders, price, index, and total values.
 */
const ItemHeader = ({ items }: Props) => {
  const [firstItem, setFirstItem] = useState<Warehouse | null>(null)

  useEffect(() => {
    setFirstItem(items[0])
  }, [items])

  if (!firstItem) return <div>Brak pozycji</div>

  const isDevice = firstItem.itemType === 'DEVICE'

  const warehouseItems = items.filter(
    (i) =>
      i.status === 'AVAILABLE' &&
      !i.assignedToId &&
      i.orderAssignments.length === 0
  )
  const technicianItems = items.filter(
    (i) =>
      i.status === 'ASSIGNED' &&
      !!i.assignedToId &&
      i.orderAssignments.length === 0
  )

  const warehouseCount = isDevice
    ? warehouseItems.length
    : warehouseItems.reduce((sum, i) => sum + i.quantity, 0)

  const technicianCount = isDevice
    ? technicianItems.length
    : technicianItems.reduce((sum, i) => sum + i.quantity, 0)

  const usedOnOrders = isDevice
    ? items.filter((i) => i.orderAssignments.length > 0).length
    : items
        .filter((i) => i.orderAssignments.length > 0)
        .reduce((sum, i) => sum + i.quantity, 0)

  const price = firstItem.price?.toFixed(2) ?? '—'
  const index = firstItem.index ?? '—'

  // Total value calculations (materials only)
  const warehouseValue = !isDevice
    ? warehouseItems.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0)
    : null

  const technicianValue = !isDevice
    ? technicianItems.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0)
    : null

  return (
    <Card className="p-4 flex flex-col md:flex-row justify-between gap-4">
      {/* Item info */}
      <div className="flex flex-col space-y-4 w-full md:w-1/2">
        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Nazwa:</p>
          <p className="text-base">{firstItem.name}</p>
        </div>

        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">
            {isDevice ? 'Kategoria:' : 'Index:'}
          </p>
          <p className="text-base">
            {isDevice ? devicesTypeMap[firstItem.category ?? ''] ?? '—' : index}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Cena jednostkowa:</p>
          <p className="text-base">{price} zł</p>
        </div>
      </div>

      {/* Stock info */}
      <div className="flex flex-col space-y-4 w-full md:w-1/2">
        <div className="flex flex-col">
          <div className="flex gap-2 items-center">
            <p className="font-bold uppercase text-sm">Stan magazynowy:</p>
            <p className="text-base">{warehouseCount}</p>
          </div>
          {!isDevice && warehouseValue !== null && (
            <p className="text-xs text-muted-foreground">
              Wartość: {warehouseValue.toFixed(2)} zł
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex gap-2 items-center">
            <p className="font-bold uppercase text-sm">Stan techników:</p>
            <p className="text-base">{technicianCount}</p>
          </div>
          {!isDevice && technicianValue !== null && (
            <p className="text-xs text-muted-foreground">
              Wartość: {technicianValue.toFixed(2)} zł
            </p>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Wydane na zleceniach:</p>
          <p className="text-base">{usedOnOrders}</p>
        </div>
      </div>
    </Card>
  )
}

export default ItemHeader
