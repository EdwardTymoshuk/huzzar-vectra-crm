'use client'

/* ---------------------------------------------------------------------
 * ItemHistoryList  (admin + technician)
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
  | {
      warehouseItemId: string
      scope?: 'all' | 'technician'
      name?: never
      dataOverride?: never
    }
  | {
      name: string
      warehouseItemId?: never
      scope?: 'all' | 'technician'
      dataOverride?: WarehouseHistoryWithUser[]
    }

/* -------- badge label + colour ------------------------------------ */
const mapAction = (
  action: WarehouseHistoryWithUser['action']
): {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'destructive' | 'secondary'
} => {
  switch (action) {
    case 'TRANSFER':
      return { label: 'Przekazanie', variant: 'secondary' }
    case 'RECEIVED':
      return { label: 'Przyjęcie', variant: 'success' }
    case 'ISSUED':
      return { label: 'Wydanie', variant: 'warning' }
    case 'RETURNED':
      return { label: 'Zwrot', variant: 'destructive' }
    case 'RETURNED_TO_OPERATOR':
      return { label: 'Zwrot do operatora', variant: 'danger' }
  }
}

const ItemHistoryList = ({
  warehouseItemId,
  name,
  dataOverride,
  scope = 'all',
}: Props) => {
  const query = name
    ? trpc.warehouse.getHistoryByName.useQuery({ name })
    : trpc.warehouse.getHistory.useQuery({
        warehouseItemId: warehouseItemId!,
        scope,
      })

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
            } else if (h.action === 'TRANSFER') {
              // Po przekazaniu „Do” = odbiorca
              to = h.assignedTo?.name ?? '—'
            } else if (h.action === 'RETURNED_TO_OPERATOR') {
              to = 'Operator'
            } else if (h.action === 'RETURNED') {
              to = 'Magazyn'
            } else if (h.action === 'ISSUED') {
              to = h.assignedTo?.name ?? 'Nieznane'
            } else {
              // RECEIVED
              to = h.assignedTo?.name ?? from
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
