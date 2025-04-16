//src/app/admin-panel/components/warehouse/ItemHeader.tsx

'use client'

import { Card } from '@/app/components/ui/card'
import { devicesTypeMap } from '@/lib/constants'
import { Warehouse } from '@prisma/client'
import { useEffect, useState } from 'react'

type Props = {
  items: Warehouse[]
}

/**
 * ItemHeader:
 * - Displays summary info about a specific warehouse item (name, category, stock).
 * - Aggregates counts for warehouse and technicians.
 */
const ItemHeader = ({ items }: Props) => {
  const [firstItem, setFirstItem] = useState<Warehouse | null>(null)

  // Count unassigned (in warehouse) and assigned (with technicians)
  const warehouseCount = items.filter((i) => !i.assignedToId).length
  const technicianCount = items.length - warehouseCount

  useEffect(() => {
    setFirstItem(items[0])
    console.log(items)
  }, [items])

  if (firstItem === null) return <div>Brak urzadzenia</div>

  return (
    <Card className="p-4 flex flex-col md:flex-row justify-between gap-4">
      {/* Device info */}
      <div className="flex flex-col space-y-4 w-1/2">
        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Nazwa:</p>
          <p className="text-base">{firstItem.name}</p>
        </div>

        <div className="flex gap-2 items-center bg">
          <p className="font-bold uppercase text-sm">Kategoria:</p>
          <p className="text-base">
            {devicesTypeMap[firstItem.category ?? ''] ||
              devicesTypeMap[firstItem.subcategory ?? ''] ||
              '—'}
          </p>
        </div>
      </div>

      {/* Stock summary */}
      <div className="flex flex-col space-y-4 w-1/2">
        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Stan magazynowy:</p>
          <p className="text-base">{warehouseCount}</p>
        </div>
        <div className="flex gap-2 items-center">
          <p className="font-bold uppercase text-sm">Stan techników:</p>
          <p className="text-base">{technicianCount}</p>
        </div>
      </div>
    </Card>
  )
}

export default ItemHeader
