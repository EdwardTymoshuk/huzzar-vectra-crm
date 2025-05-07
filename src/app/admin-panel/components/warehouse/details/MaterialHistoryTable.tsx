'use client'

import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { formatDateTime } from '@/utils/formatDateTime'
import { trpc } from '@/utils/trpc'

type Props = {
  name: string
}

/**
 * MaterialHistoryTable:
 * - Displays a flat table of history for a given material name.
 * - Each row includes: date, operation type, from, to, quantity, and notes.
 * - No accordion used; this is a flat view by material name.
 */
const MaterialHistoryTable = ({ name }: Props) => {
  const { data, isLoading, isError } = trpc.warehouse.getHistoryByName.useQuery(
    { name }
  )

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (isError || !data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Brak historii dla tego materiału.
      </p>
    )
  }

  const mappedRows = data.map((entry) => {
    const date = formatDateTime(entry.actionDate)
    const from = entry.performedBy?.name ?? '—'
    const to =
      entry.action === 'RETURNED'
        ? 'Magazyn'
        : entry.action === 'ISSUED'
        ? entry.assignedTo?.name ?? 'Nieznany technik'
        : 'Magazyn'

    let actionLabel = ''
    let badgeVariant: 'success' | 'warning' | 'destructive' = 'success'

    switch (entry.action) {
      case 'RECEIVED':
        actionLabel = 'Przyjęcie'
        badgeVariant = 'success'
        break
      case 'ISSUED':
        actionLabel = 'Wydanie'
        badgeVariant = 'warning'
        break
      case 'RETURNED':
        actionLabel = 'Zwrot'
        badgeVariant = 'destructive'
        break
    }

    return {
      id: entry.id,
      date,
      from,
      to,
      quantity: entry.quantity ?? '—',
      notes: entry.notes ?? '—',
      actionLabel,
      badgeVariant,
    }
  })

  return (
    <div className="border rounded-md overflow-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Od</TableHead>
            <TableHead>Do</TableHead>
            <TableHead>Ilość</TableHead>
            <TableHead>Uwagi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappedRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>
                <Badge variant={row.badgeVariant}>{row.actionLabel}</Badge>
              </TableCell>
              <TableCell>{row.from}</TableCell>
              <TableCell>{row.to}</TableCell>
              <TableCell>{row.quantity}</TableCell>
              <TableCell>{row.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default MaterialHistoryTable
