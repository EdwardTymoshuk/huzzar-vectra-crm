'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { OrderType } from '@prisma/client'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OrderType
}

/**
 * TechnicianEfficiencyTable
 * ------------------------------------------------------------------
 * Displays:
 *  - received (assigned + completed + notCompleted)
 *  - completed
 *  - notCompleted
 *  - successRate (completed/received)
 *
 * Fully synced with backend logic.
 */
const TechnicianEfficiencyTable = ({ date, range, orderType }: Props) => {
  const { data, isLoading, isError } =
    trpc.user.getTechnicianEfficiency.useQuery({
      date: date?.toISOString() ?? new Date().toISOString(),
      range,
      orderType,
    })

  if (isLoading || !data) {
    return (
      <Card className="p-4 my-6">
        <h2 className="text-lg font-semibold mb-4">Ranking techników</h2>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-full" />
      </Card>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center mt-4">
        Nie udało się załadować danych o technikach.
      </p>
    )
  }

  return (
    <Card className="p-4 my-6 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4">Ranking techników</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lp</TableHead>
            <TableHead>Technik</TableHead>
            <TableHead>Otrzymane</TableHead>
            <TableHead>Wykonane</TableHead>
            <TableHead>Niewykonane</TableHead>
            <TableHead>Skuteczność</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((tech, index) => {
            const variant =
              tech.successRate >= 90
                ? 'success'
                : tech.successRate >= 70
                ? 'warning'
                : 'destructive'

            return (
              <TableRow key={tech.technicianId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{tech.technicianName}</TableCell>
                <TableCell>{tech.received}</TableCell>
                <TableCell>{tech.completed}</TableCell>
                <TableCell>{tech.notCompleted}</TableCell>
                <TableCell>
                  <Badge variant={variant}>{tech.successRate}%</Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

export default TechnicianEfficiencyTable
