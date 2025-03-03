'use client'

import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { statusMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { MdClose } from 'react-icons/md'

/**
 * OrderDetailsPanel component:
 * - Displays order details in a right-side off-canvas panel (Sheet).
 * - Fetches data dynamically from the API.
 */
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
      <SheetContent side="right" className="w-full max-w-md p-6">
        <SheetHeader className="flex flex-row justify-between items-center">
          <SheetTitle>Szczegóły zlecenia</SheetTitle>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <MdClose className="w-5 h-5" />
          </Button>
        </SheetHeader>

        {isLoading ? (
          <p className="text-gray-500">Ładowanie...</p>
        ) : isError ? (
          <p className="text-red-500">Błąd ładowania danych</p>
        ) : order ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Nr zlecenia:</strong> {order.orderNumber}
            </p>
            <p>
              <strong>Data:</strong>{' '}
              {new Date(order.date).toLocaleDateString('pl-PL')}
            </p>
            <p>
              <strong>Status:</strong> {statusMap[order.status] || order.status}
            </p>
            <p>
              <strong>Adres:</strong> {order.city}, {order.street}
            </p>
            <p>
              <strong>Technik:</strong>{' '}
              {order.assignedTo?.name || 'Nieprzypisany'}
            </p>
            <p>
              <strong>Uwagi:</strong> {order.notes || 'Brak'}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Nie znaleziono zlecenia</p>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default OrderDetailsPanel
