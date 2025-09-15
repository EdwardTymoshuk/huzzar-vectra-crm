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

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

/**
 * TechnicianEfficiencyTable:
 * - Shows detailed breakdown of all technician stats.
 * - Only COMPLETED & NOT_COMPLETED are included in success rate.
 */
const TechnicianEfficiencyTable = ({ date, range }: Props) => {
  const { data, isLoading, isError } =
    trpc.user.getTechnicianEfficiency.useQuery({
      date: date?.toISOString() ?? new Date().toISOString(),
      range,
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
            <TableHead>Wykonane</TableHead>
            <TableHead>Niewykonane</TableHead>
            <TableHead>Skuteczność</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((tech, index) => {
            const { completed, notCompleted } = tech
            const total = completed + notCompleted
            const successRate =
              total > 0 ? Math.round((completed / total) * 100) : 0

            const variant =
              successRate >= 90
                ? 'success'
                : successRate >= 70
                ? 'warning'
                : 'destructive'

            return (
              <TableRow key={tech.technicianId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{tech.technicianName}</TableCell>
                <TableCell>{completed}</TableCell>
                <TableCell>{notCompleted}</TableCell>
                <TableCell>
                  <Badge variant={variant}>{successRate}%</Badge>
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
