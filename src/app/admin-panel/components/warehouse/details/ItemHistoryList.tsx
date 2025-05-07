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
import { WarehouseHistoryWithUser } from '@/types'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'

type Props =
  | { warehouseItemId: string; name?: never; dataOverride?: never }
  | {
      name: string
      warehouseItemId?: never
      dataOverride?: WarehouseHistoryWithUser[]
    }

/**
 * ItemHistoryList:
 * - Displays history either for a specific item (by ID) or for all matching items (by name).
 * - Optional `dataOverride` allows manual filtering (for tabs).
 */
const ItemHistoryList = ({ warehouseItemId, name, dataOverride }: Props) => {
  const isByName = !!name

  const historyQuery = isByName
    ? trpc.warehouse.getHistoryByName.useQuery({ name: name! })
    : trpc.warehouse.getHistory.useQuery({ warehouseItemId: warehouseItemId! })

  const { data, isLoading, isError } = historyQuery

  const rows = dataOverride ?? data

  if (isLoading || !rows) return <Skeleton className="h-32 w-full" />
  if (isError || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center">
        Brak historii dla tego elementu.
      </p>
    )

  return (
    <div className="border rounded-md overflow-auto">
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
          {rows.map((entry) => {
            const date = format(new Date(entry.actionDate), 'dd.MM.yyyy')
            const from = entry.performedBy?.name ?? '—'
            const to =
              entry.action === 'RETURNED'
                ? 'Magazyn'
                : entry.action === 'ISSUED'
                ? entry.assignedTo?.name ?? 'Nieznane'
                : 'Magazyn'

            let label = ''
            let variant: 'success' | 'warning' | 'destructive' = 'success'
            switch (entry.action) {
              case 'RECEIVED':
                label = 'Przyjęcie'
                variant = 'success'
                break
              case 'ISSUED':
                label = 'Wydanie'
                variant = 'warning'
                break
              case 'RETURNED':
                label = 'Zwrot'
                variant = 'destructive'
                break
            }

            return (
              <TableRow key={entry.id}>
                <TableCell>{date}</TableCell>
                <TableCell>
                  <Badge variant={variant}>{label}</Badge>
                </TableCell>
                <TableCell>{from}</TableCell>
                <TableCell>{to}</TableCell>
                <TableCell>{entry.quantity ?? '—'}</TableCell>
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
