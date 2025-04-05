'use client'

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
import { format } from 'date-fns'

type Props = {
  warehouseItemId: string
}

/**
 * ItemHistoryList:
 * - Displays a full transaction history for a given warehouse item.
 * - Renders as a clean table with columns: Date, From, To, Notes.
 */
const ItemHistoryList = ({ warehouseItemId }: Props) => {
  const { data, isLoading, isError } = trpc.warehouse.getHistory.useQuery({
    warehouseItemId,
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (isError || !data || data.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center">
        Brak historii dla tego urządzenia.
      </p>
    )

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Od</TableHead>
            <TableHead>Do</TableHead>
            <TableHead>Uwagi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => {
            const date = format(new Date(entry.actionDate), 'dd.MM.yyyy')

            // Determine from/to based on action
            const from = entry.performedBy?.name ?? '-'

            const to =
              entry.action === 'RETURNED'
                ? 'Magazyn'
                : entry.action === 'ISSUED'
                ? entry.assignedTo?.name ?? 'Nieznane'
                : 'Magazyn'

            return (
              <TableRow key={entry.id}>
                <TableCell>{date}</TableCell>
                <TableCell>{from}</TableCell>
                <TableCell>{to}</TableCell>
                <TableCell>{entry.notes ?? '—'}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default ItemHistoryList
