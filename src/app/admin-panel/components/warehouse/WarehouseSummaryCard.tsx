//src/app/admin-panel/components/warehouse/warehouseSummaryCard.tsx

'use client'

import { useActiveLocation } from '@/app/(modules)/vectra-crm/utils/hooks/useActiveLocation'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'

/**
 * WarehouseSummaryCard:
 * - Displays total quantity and value of devices and materials in stock.
 * - Helps admins track inventory value at a glance.
 */
const WarehouseSummaryCard = () => {
  const locationId = useActiveLocation()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery(
    { locationId: locationId ?? undefined },
    {
      enabled: isAdmin || isCoordinator ? !!locationId : !isTechnician,
    }
  )

  if (isLoading || !data) {
    return <Skeleton className="h-[140px] w-full" />
  }

  if (isError) return null

  const devices = data.filter(
    (item) => item.itemType === 'DEVICE' && item.status === 'AVAILABLE'
  )
  const materials = data.filter(
    (item) => item.itemType === 'MATERIAL' && item.status === 'AVAILABLE'
  )

  const deviceCount = devices.length
  const materialCount = materials.reduce((acc, m) => acc + m.quantity, 0)

  const deviceValue = devices.reduce((acc, item) => acc + (item.price ?? 0), 0)
  const materialValue = materials.reduce(
    (acc, item) => acc + (item.price ?? 0) * item.quantity,
    0
  )
  const totalValue = deviceValue + materialValue

  return (
    <Card className="p-4 grid xs:grid-cols-2 md:grid-cols-5 gap-4 text-sm font-medium">
      <div>
        <p className="text-muted-foreground">Urządzenia (szt.)</p>
        <p className="text-lg font-semibold">{deviceCount}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Materiały (szt.)</p>
        <p className="text-lg font-semibold">{materialCount}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Wartość urządzeń</p>
        <p className="text-lg font-semibold">{deviceValue.toFixed(2)} zł</p>
      </div>
      <div>
        <p className="text-muted-foreground">Wartość materiałów</p>
        <p className="text-lg font-semibold">{materialValue.toFixed(2)} zł</p>
      </div>
      <div className="col-span-full md:col-span-1">
        <p className="text-muted-foreground">Łączna wartość magazynu</p>
        <p className="text-xl font-bold text-primary">
          {totalValue.toFixed(2)} zł
        </p>
      </div>
    </Card>
  )
}

export default WarehouseSummaryCard
