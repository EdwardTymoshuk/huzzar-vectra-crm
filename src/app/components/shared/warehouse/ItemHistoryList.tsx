'use client'

/* ---------------------------------------------------------------------
 * ItemHistoryList
 * ---------------------------------------------------------------------
 * • Reusable history table – works for both admin and technician views.
 * • Data source:
 *     – by name  → trpc.warehouse.getHistoryByName
 *     – by item-id (serialised device) → trpc.warehouse.getHistory
 * • Optional `dataOverride` lets parent supply a pre-filtered subset
 *   (used by tab containers).
 * ------------------------------------------------------------------- */

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

/* helper for badge colour + label */
const mapAction = (
  action: WarehouseHistoryWithUser['action']
): {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'destructive'
} => {
  switch (action) {
    case 'RECEIVED':
      return { label: 'Przyjęcie', variant: 'success' }
    case 'ISSUED':
      return { label: 'Wydanie', variant: 'warning' }
    case 'RETURNED':
      return { label: 'Zwrot', variant: 'danger' }
    case 'RETURNED_TO_OPERATOR':
      return { label: 'Zwrot', variant: 'destructive' }
  }
}

const ItemHistoryList = ({ warehouseItemId, name, dataOverride }: Props) => {
  const query = name
    ? trpc.warehouse.getHistoryByName.useQuery({ name })
    : trpc.warehouse.getHistory.useQuery({ warehouseItemId: warehouseItemId! })

  const { data, isLoading, isError } = query
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
          {rows.map((h) => {
            const { label, variant } = mapAction(h.action)

            const from = h.performedBy?.name ?? '—'
            let to: string
            if (h.assignedOrder?.orderNumber) {
              to = `Zl: ${h.assignedOrder.orderNumber}`
            } else {
              to =
                h.action === 'RETURNED_TO_OPERATOR'
                  ? 'Operator'
                  : h.action === 'RETURNED'
                  ? 'Magazyn'
                  : h.action === 'ISSUED'
                  ? h.assignedTo?.name ?? 'Nieznane'
                  : 'Magazyn'
            }
            return (
              <TableRow key={h.id}>
                <TableCell>
                  {format(h.actionDate, 'dd.MM.yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant={variant}>{label}</Badge>
                </TableCell>
                <TableCell>{from}</TableCell>
                <TableCell>{to}</TableCell>
                <TableCell>{h.quantity ?? '—'}</TableCell>
                <TableCell
                  className="max-w-[280px] truncate"
                  title={h.notes ?? ''}
                >
                  {h.notes ?? '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default ItemHistoryList
