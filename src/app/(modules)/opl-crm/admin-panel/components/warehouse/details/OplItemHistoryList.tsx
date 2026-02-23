'use client'

/* ---------------------------------------------------------------------
 * OplItemHistoryList  (admin + technician)
 * ------------------------------------------------------------------- */

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { OplWarehouseHistoryRowVM } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { ReactNode, useState } from 'react'

type HistoryContext = 'warehouse' | 'technicians' | 'orders' | 'returned'

type BaseProps = {
  scope?: 'all' | 'technician'
  context?: HistoryContext
}

type Props =
  | (BaseProps & {
      warehouseItemId: string
      name?: never
      dataOverride?: never
    })
  | (BaseProps & {
      name: string
      warehouseItemId?: never
      dataOverride?: OplWarehouseHistoryRowVM[]
    })

/* -------- badge label + colour ------------------------------------ */
const mapAction = (
  action: OplWarehouseHistoryRowVM['action']
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
    case 'ASSIGNED_TO_ORDER':
      return { label: 'Wydane na zleceniu', variant: 'warning' }
    case 'RETURNED':
      return { label: 'Zwrot', variant: 'destructive' }
    case 'RETURNED_TO_OPERATOR':
      return { label: 'Zwrot do operatora', variant: 'danger' }
    case 'RETURNED_TO_TECHNICIAN':
      return { label: 'Przywrócenie do technika', variant: 'danger' }
    case 'COLLECTED_FROM_CLIENT':
      return { label: 'Odbiór od klienta', variant: 'secondary' }
    default:
      return { label: '—', variant: 'secondary' }
  }
}

const OplItemHistoryList = ({
  warehouseItemId,
  name,
  dataOverride,
  scope = 'all',
  context,
}: Props) => {
  const [orderId, setOrderId] = useState<string | null>(null)

  const query = name
    ? trpc.opl.warehouse.getOplHistoryByName.useQuery({ name })
    : trpc.opl.warehouse.getOplHistory.useQuery({
        warehouseItemId: warehouseItemId!,
        scope,
      })

  const { data, isLoading, isError } = query
  const rows = dataOverride?.length ? dataOverride : data

  if (isLoading || !rows) return <Skeleton className="h-32 w-full" />
  if (isError || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center">
        Brak historii dla tego elementu.
      </p>
    )

  let whoHeader = 'Kto'
  let whereHeader = 'Gdzie'

  switch (context) {
    case 'warehouse':
    case 'technicians':
      whoHeader = 'Kto'
      whereHeader = 'Do kogo'
      break
    case 'orders':
      whoHeader = 'Kto'
      whereHeader = 'Zlecenie'
      break
    case 'returned':
      whoHeader = 'Kto'
      whereHeader = 'Od kogo'
      break
    default:
      whoHeader = 'Kto'
      whereHeader = 'Gdzie'
  }

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>{whoHeader}</TableHead>
            <TableHead>{whereHeader}</TableHead>
            <TableHead>Ilość</TableHead>
            <TableHead>Uwagi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((h) => {
            const { label, variant } = mapAction(h.action)

            const from = h.performedBy?.name ?? '—'
            let to: ReactNode = '—'

            if (h.assignedOrder?.orderNumber) {
              to = (
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setOrderId(h.assignedOrderId!)}
                >
                  {h.assignedOrder.orderNumber}
                </Button>
              )
            } else if (h.action === 'TRANSFER') {
              to = h.assignedTo?.name ?? '—'
            } else if (h.action === 'RETURNED_TO_OPERATOR') {
              to = 'Operator'
            } else if (
              h.action === 'RETURNED' ||
              h.action === 'RETURNED_TO_TECHNICIAN'
            ) {
              to = h.assignedTo?.name ?? 'Magazyn/Technik'
            } else if (h.action === 'ISSUED') {
              to = h.assignedTo?.name ?? 'Technik'
            } else {
              to = '—'
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

      {/* <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      /> */}
    </div>
  )
}

export default OplItemHistoryList
