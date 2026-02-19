'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import OplOrderDetailsSheet from '@/app/(modules)/opl-crm/components/order/OplOrderDetailsSheet'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  dateFrom?: Date
  dateTo?: Date
  orderType: OplOrderType
}

const OplInProgressOrdersDialog = ({
  open,
  onClose,
  dateFrom,
  dateTo,
  orderType,
}: Props) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { data, isLoading } = trpc.opl.order.getAllInProgress.useQuery(
    {
      dateFrom,
      dateTo,
      orderType,
    },
    {
      enabled: open,
    }
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Zlecenia w realizacji</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Nr zlecenia</TableHead>
                <TableHead className="text-center">Adres</TableHead>
                <TableHead className="text-center">Technik</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    Brak zleceń w realizacji.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedOrderId(o.id)}
                  >
                    <TableCell className="text-center font-medium">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.city}, {o.street}
                    </TableCell>
                    <TableCell className="text-center text-primary">
                      {o.technicians?.length
                        ? o.technicians.map((t) => t.name).join(' / ')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <OplOrderDetailsSheet
        orderId={selectedOrderId}
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
      />
    </Dialog>
  )
}

export default OplInProgressOrdersDialog
