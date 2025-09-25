'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { orderTypeMap, statusMap, timeSlotMap } from '@/lib/constants'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/roleHelpers/useRole'
import { trpc } from '@/utils/trpc'
import { OrderHistory } from '@prisma/client'

type Props = {
  orderId: string | null
  onClose: () => void
  open: boolean
}

/* ---------------- Types ---------------- */
type OrderHistoryWithUser = OrderHistory & {
  changedBy: { id: string; name: string }
}

/* ---------------- Helpers ---------------- */
const formatHistoryEntry = (entry: OrderHistoryWithUser) => {
  const who = entry.changedBy?.name || 'Nieznany użytkownik'

  if (entry.notes) {
    return `${formatDateTime(entry.changeDate)} – ${entry.notes}`
  }

  if (entry.statusBefore !== entry.statusAfter) {
    return `${formatDateTime(entry.changeDate)} – Status zmieniony z "${
      statusMap[entry.statusBefore]
    }" na "${statusMap[entry.statusAfter]}" przez ${who}`
  }

  return `${formatDateTime(entry.changeDate)} – Edytowane przez ${who}`
}

/* ---------------- Component ---------------- */
const OrderDetailsSheet = ({ orderId, onClose, open }: Props) => {
  const { isTechnician } = useRole()

  const {
    data: order,
    isLoading,
    isError,
  } = trpc.order.getOrderById.useQuery(
    { id: orderId ?? '' },
    { enabled: !!orderId }
  )

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md max-h-screen overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle asChild>
            <h2>Szczegóły zlecenia</h2>
          </SheetTitle>
        </SheetHeader>

        {/* Loading / error states */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : isError || !order ? (
          <p className="text-danger">Błąd ładowania danych.</p>
        ) : (
          <div className="space-y-5 text-sm divide-y divide-border">
            {/* Basic info */}
            <section className="space-y-3">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Nr zlecenia
                  </h3>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Data
                  </h3>
                  <p className="font-medium">
                    {formatDateTime(order.date).split(' ')[0]}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Typ zlecenia
                </h3>
                <p>{orderTypeMap[order.type] ?? order.type}</p>
              </div>

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Przedział czasowy
                </h3>
                <p>{timeSlotMap[order.timeSlot] ?? order.timeSlot}</p>
              </div>

              {!isTechnician && (
                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Technik
                  </h3>
                  <p>{order.assignedTo?.name ?? 'Nieprzypisany'}</p>
                </div>
              )}

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Status
                </h3>
                <Badge
                  variant={
                    order.status === 'COMPLETED'
                      ? 'success'
                      : order.status === 'NOT_COMPLETED'
                      ? 'danger'
                      : order.status === 'ASSIGNED'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {statusMap[order.status] ?? order.status}
                </Badge>
              </div>

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Operator
                </h3>
                <p>{order.operator}</p>
              </div>

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Adres
                </h3>
                <p>
                  {order.city}, {order.street}
                  {order.postalCode &&
                    order.postalCode !== '00-000' &&
                    ` (${order.postalCode})`}
                </p>
              </div>

              {order.completedAt && (
                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Zamknięte
                  </h3>
                  <p>{formatDateTime(order.completedAt)}</p>
                </div>
              )}

              <div>
                <h3 className="text-xs text-muted-foreground font-medium">
                  Uwagi
                </h3>
                <p>{order.notes || '—'}</p>
              </div>
            </section>

            {/* Completed order – work codes, equipment, materials */}
            {order.status === 'COMPLETED' && (
              <section className="space-y-3 pt-3">
                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Kody pracy
                  </h3>
                  {order.settlementEntries?.length ? (
                    <ul className="list-disc pl-4">
                      {order.settlementEntries.map((entry) => (
                        <li key={entry.id}>
                          {entry.code} – {entry.quantity}× (
                          {entry.rate?.amount?.toFixed(2) ?? '0.00'} zł)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Brak</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Wydany sprzęt
                  </h3>
                  {order.assignedEquipment?.length ? (
                    <ul className="list-disc pl-4">
                      {order.assignedEquipment.map((item) => (
                        <li key={item.id}>
                          {item.warehouse.name}
                          {item.warehouse.serialNumber
                            ? ` (SN: ${item.warehouse.serialNumber})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Brak</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Materiały
                  </h3>
                  {order.usedMaterials?.length ? (
                    <ul className="list-disc pl-4">
                      {order.usedMaterials.map((m) => (
                        <li key={m.id}>
                          {m.material.name} – {m.quantity} {m.unit}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Brak</p>
                  )}
                </div>

                <div className="font-semibold text-sm">
                  Kwota:{' '}
                  {order.settlementEntries
                    .reduce(
                      (acc, e) =>
                        acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
                      0
                    )
                    .toFixed(2)}{' '}
                  zł
                </div>
              </section>
            )}

            {/* Not completed order */}
            {order.status === 'NOT_COMPLETED' && (
              <section className="pt-3">
                <h3 className="text-xs text-muted-foreground font-medium">
                  Powód niewykonania
                </h3>
                <p>{order.failureReason || '—'}</p>
              </section>
            )}

            {/* History – only for admin/coordinator */}
            {!isTechnician && (
              <section className="pt-3">
                <h3 className="text-xs text-muted-foreground font-medium">
                  Historia
                </h3>
                {order.history?.length ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {order.history.map((entry) => (
                      <li key={entry.id}>{formatHistoryEntry(entry)}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Brak</p>
                )}
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default OrderDetailsSheet
