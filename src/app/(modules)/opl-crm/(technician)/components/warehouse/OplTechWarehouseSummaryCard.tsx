'use client'

import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'

/**
 * OplTechWarehouseSummaryCard (technician):
 * - Shows total quantity and value of devices and materials
 *   **belonging to the logged-in technician**.
 */
const OplTechWarehouseSummaryCard = () => {
  /* current user */
  const { data: session } = useSession()
  if (!session) return null

  /* technician-scoped stock */
  const { data, isLoading, isError } =
    trpc.opl.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
    })

  /* skeleton / error */
  if (isLoading || !data) return <Skeleton className="h-[140px] w-full" />
  if (isError) return null

  /* aggregations */
  const devices = data.filter((i) => i.itemType === 'DEVICE')
  const materials = data.filter((i) => i.itemType === 'MATERIAL')

  const deviceCount = devices.length
  const materialCount = materials.reduce((acc, m) => acc + (m.quantity ?? 0), 0)

  const deviceValue = devices.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const materialValue = materials.reduce(
    (sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 0),
    0
  )
  const totalValue = deviceValue + materialValue

  /* render */
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

export default OplTechWarehouseSummaryCard
