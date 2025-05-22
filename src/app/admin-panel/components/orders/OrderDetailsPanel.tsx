'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { statusMap, timeSlotMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OrderHistory } from '@prisma/client'

/**
 * OrderDetailsPanel component:
 * - Displays order details in a right-side off-canvas panel (Sheet).
 * - Fetches data dynamically from the API, including order history.
 */

type OrderHistoryWithUser = OrderHistory & {
  changedBy: {
    id: string
    name: string
  }
}

const OrderDetailsPanel = ({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null
  open: boolean
  onClose: () => void
}) => {
  // Fetch order details using tRPC (only if orderId exists)
  const {
    data: order,
    isLoading,
    isError,
  } = trpc.order.getOrderById.useQuery(
    { id: orderId! },
    { enabled: Boolean(orderId) }
  )

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95%] md:max-w-md">
        {/* Header */}
        <SheetHeader className="flex flex-row justify-between items-center">
          <SheetTitle>Szczegóły zlecenia</SheetTitle>
        </SheetHeader>

        {/* Loading / Error Handling */}
        {isLoading ? (
          <p className="text-gray-500">Ładowanie...</p>
        ) : isError ? (
          <p className="text-danger">Błąd ładowania danych</p>
        ) : order ? (
          <>
            {/* Order Details */}
            <div className="space-y-3 text-sm">
              <p>
                <strong>Nr zlecenia:</strong> {order.orderNumber}
              </p>
              <p>
                <strong>Operator:</strong> {order.operator}
              </p>
              <p>
                <strong>Typ zlecenia:</strong>{' '}
                {order.type === 'INSTALATION' ? 'Instalacja' : 'Serwis'}
              </p>
              <p>
                <strong>Data:</strong>{' '}
                {new Date(order.date).toLocaleDateString('pl-PL')}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`font-medium ${statusMap[order.status]}`}>
                  {statusMap[order.status] || order.status}
                </span>
              </p>
              <p>
                <strong>Przedział czasowy:</strong>{' '}
                {timeSlotMap[order.timeSlot]}
              </p>
              <p>
                <strong>Adres:</strong> {order.city}, {order.street}
              </p>
              <p>
                <strong>Kod pocztowy:</strong> {order.postalCode}
              </p>
              <p>
                <strong>Technik:</strong>{' '}
                {order.assignedTo?.name || 'Nieprzypisany'}
              </p>
              <p>
                <strong>Telefon klienta:</strong>{' '}
                {order.clientPhoneNumber || 'Brak'}
              </p>
              <p>
                <strong>Wymaga umowy:</strong>{' '}
                {order.contractRequired ? 'Tak' : 'Nie'}
              </p>
              <p>
                <strong>Potrzebny sprzęt:</strong>{' '}
                {order.equipmentNeeded.length > 0
                  ? order.equipmentNeeded.join(', ')
                  : 'Brak'}
              </p>
              <p>
                <strong>Uwagi:</strong> {order.notes || 'Brak'}
              </p>
            </div>

            {/* Order History Table */}
            {order.history?.length > 0 ? (
              <div className="pt-4">
                <h3 className="text-lg font-semibold">Historia zmian</h3>
                <Table className="border rounded-lg mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Zmienione przez</TableHead>
                      <TableHead>Poprzedni status</TableHead>
                      <TableHead>Nowy status</TableHead>
                      <TableHead>Uwagi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.history?.map((entry: OrderHistoryWithUser) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.changeDate).toLocaleString('pl-PL')}
                        </TableCell>
                        <TableCell>
                          {entry.changedBy.name ?? 'Nieznany użytkownik'}
                        </TableCell>
                        <TableCell>
                          {statusMap[entry.statusBefore] || entry.statusBefore}
                        </TableCell>
                        <TableCell>
                          {statusMap[entry.statusAfter] || entry.statusAfter}
                        </TableCell>
                        <TableCell>{entry.notes || 'Brak'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-500">Brak historii zmian</p>
            )}
          </>
        ) : (
          <p className="text-gray-500">Nie znaleziono zlecenia</p>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default OrderDetailsPanel
