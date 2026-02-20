'use client'

import { Card } from '@/app/components/ui/card'
import { OplOrderType } from '@prisma/client'

type ActiveOrderRow = {
  id: string
  type: OplOrderType
}

type Props = {
  activeOrders: ActiveOrderRow[]
}

const OplTechActiveQueueKpis = ({ activeOrders }: Props) => {
  const total = activeOrders.length
  const installations = activeOrders.filter(
    (o) => o.type === OplOrderType.INSTALLATION
  ).length
  const services = activeOrders.filter((o) => o.type === OplOrderType.SERVICE).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <Card className="p-4 text-center">
        <p className="text-sm text-muted-foreground">W realizacji</p>
        <p className="text-2xl font-bold">{total}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Instalacje</p>
        <p className="text-2xl font-bold text-primary">{installations}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Serwisy</p>
        <p className="text-2xl font-bold text-warning">{services}</p>
      </Card>
    </div>
  )
}

export default OplTechActiveQueueKpis

