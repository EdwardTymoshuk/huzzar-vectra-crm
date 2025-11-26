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
import { useMemo, useState } from 'react'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
  orderType: OrderType
}

type SortKey =
  | 'technicianName'
  | 'received'
  | 'completed'
  | 'notCompleted'
  | 'assigned'
  | 'successRate'

/**
 * TechnicianEfficiencyTable
 * ------------------------------------------------------------------
 * Displays technician efficiency ranking (received, completed,
 * notCompleted, successRate) with sortable columns.
 */
const TechnicianEfficiencyTable = ({ date, range, orderType }: Props) => {
  const { data, isLoading, isError } =
    trpc.user.getTechnicianEfficiency.useQuery({
      date: date?.toISOString() ?? new Date().toISOString(),
      range,
      orderType,
    })

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('successRate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  /**
   * Toggles sorting key & direction when clicking table headers.
   */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  /**
   * Returns proper sorting icon for each column.
   */
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key)
      return <TiArrowUnsorted className="inline-block text-base" />
    return sortDirection === 'asc' ? (
      <TiArrowSortedUp className="inline-block text-base" />
    ) : (
      <TiArrowSortedDown className="inline-block text-base" />
    )
  }

  /**
   * Memoized sorted data to avoid re-sorting on every render.
   */
  const sortedData = useMemo(() => {
    if (!data) return []

    return [...data].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]

      // String sorting
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      // Number sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }

      return 0
    })
  }, [data, sortKey, sortDirection])

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

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('technicianName')}
              >
                Technik
                {renderSortIcon('technicianName')}
              </span>
            </TableHead>

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('received')}
              >
                Otrzymane
                {renderSortIcon('received')}
              </span>
            </TableHead>

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('completed')}
              >
                Wykonane
                {renderSortIcon('completed')}
              </span>
            </TableHead>

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('notCompleted')}
              >
                Niewykonane
                {renderSortIcon('notCompleted')}
              </span>
            </TableHead>

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('assigned')}
              >
                Przypisane
                {renderSortIcon('assigned')}
              </span>
            </TableHead>

            <TableHead>
              <span
                className="flex items-center gap-1 cursor-pointer select-none"
                onClick={() => toggleSort('successRate')}
              >
                Skuteczność
                {renderSortIcon('successRate')}
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((tech, index) => {
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
                <TableCell>{tech.assigned}</TableCell>
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
