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
import { trpc } from '@/utils/trpc'
import { OrderType } from '@prisma/client'

type Props = {
  open: boolean
  onClose: () => void
  dateFrom?: Date
  dateTo?: Date
  orderType: OrderType
  onOpenOrder: (id: string) => void
}

/**
 * InProgressOrdersDialog
 * --------------------------------------------------
 * Displays list of in-progress (ASSIGNED) orders
 * for given order type and date range.
 */
const InProgressOrdersDialog = ({
  open,
  onClose,
  dateFrom,
  dateTo,
  orderType,
  onOpenOrder,
}: Props) => {
  const { data, isLoading } = trpc.order.getAllInProgress.useQuery(
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
      <DialogContent className="max-w-3xl">
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
                    onClick={() => onOpenOrder(o.id)}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <TableCell className="text-center font-medium">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.city}, {o.street}
                    </TableCell>
                    <TableCell className="text-center text-primary">
                      {o.assignedTo?.name ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default InProgressOrdersDialog
