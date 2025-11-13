'use client'

import EditOrderModal from '@/app/admin-panel/components/orders/EditOrderModal'
import ConfirmDeleteDialog from '@/app/components/shared/ConfirmDeleteDialog'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap, orderTypeMap, timeSlotMap } from '@/lib/constants'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import OrderStatusBadge from '../OrderStatusBadge'
import OrderTimeline from './OrderTimeline'

type Props = {
  orderId: string | null
  onClose: () => void
  open: boolean
}

/**
 * OrderDetailsSheet
 * -------------------------------------------------------------
 * Role-based order details view:
 * - Technician: can view all orders but without edit/delete and
 *   without status for "ASSIGNED" or "PENDING" ones.
 * - Admin/Coordinator: full details with actions.
 */
const OrderDetailsSheet = ({ orderId, onClose, open }: Props) => {
  const { isTechnician } = useRole()
  const utils = trpc.useUtils()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const {
    data: order,
    isLoading,
    isError,
  } = trpc.order.getOrderById.useQuery(
    { id: orderId ?? '' },
    { enabled: !!orderId }
  )

  const deleteMutation = trpc.order.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało pomyślnie usunięte.')
      utils.order.getTechnicianActiveOrders.invalidate()
      utils.order.getAssignedOrders.invalidate()
      utils.order.getUnassignedOrders.invalidate()
      setShowDeleteDialog(false)
      onClose()
    },
    onError: (err) => {
      console.error('[deleteOrder error]', err)

      // ▸ More detailed backend error mapping
      if (err.data?.code === 'NOT_FOUND') {
        toast.error('Zlecenie już nie istnieje.')
      } else if (err.data?.code === 'BAD_REQUEST') {
        toast.error('Nie można usunąć wykonanego zlecenia.')
      } else if (err.data?.code === 'CONFLICT') {
        toast.error('Nie można usunąć zlecenia powiązanego z innymi rekordami.')
      } else {
        toast.error('Wystąpił nieoczekiwany błąd podczas usuwania.')
      }

      setShowDeleteDialog(false)
    },
  })

  const handleDelete = () => {
    if (!order) return
    deleteMutation.mutate({ id: order.id })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md max-h-screen overflow-y-auto"
        >
          <SheetHeader className="mb-4 flex justify-between items-center">
            <SheetTitle asChild>
              <h2>Szczegóły zlecenia</h2>
            </SheetTitle>

            {/* --- Only Admin/Coordinator see action buttons --- */}
            {!isTechnician && order && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  Edytuj
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={
                    order.status === 'COMPLETED' ||
                    order.status === 'NOT_COMPLETED'
                  }
                >
                  Usuń
                </Button>
              </div>
            )}
          </SheetHeader>

          {/* --- Loading / error states --- */}
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
              {/* --- Basic info --- */}
              <section className="space-y-3">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Nr zlecenia
                    </h3>
                    <p className="font-medium">{order.orderNumber}</p>
                  </div>
                  {order.attemptNumber > 1 && (
                    <div>
                      <h3 className="text-xs text-muted-foreground font-medium">
                        Nr wejście
                      </h3>
                      <p className="font-medium text-center">
                        {order.attemptNumber}
                      </p>
                    </div>
                  )}
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
                    Id klienta
                  </h3>
                  <p>{order.clientId ? order.clientId : '-'}</p>
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

                {/* --- Status (hidden for technician if assigned/pending) --- */}
                {!(
                  isTechnician &&
                  (order.status === 'ASSIGNED' || order.status === 'PENDING')
                ) && (
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Status
                    </h3>
                    <OrderStatusBadge status={order.status} compact />
                  </div>
                )}

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

              {/* --- Completed order (work codes, services, equipment, materials) --- */}
              {order.status === 'COMPLETED' && (
                <section className="space-y-3 pt-3">
                  {/* --- Work codes --- */}
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

                  {/* --- Activated services --- */}
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Uruchomione usługi
                    </h3>
                    {order.services?.length ? (
                      <ul className="list-disc pl-4">
                        {order.services.map((s) => (
                          <li key={s.id} className="mt-1">
                            <>
                              {s.type}
                              {s.notes && (
                                <div className="text-xs text-muted-foreground ml-4">
                                  Komentarz: {s.notes}
                                </div>
                              )}
                            </>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>

                  {/* --- Issued equipment --- */}
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Sprzęt wydany w ramach zlecenia
                    </h3>

                    {/* Show issued devices from services (installation) */}
                    {order.services?.some(
                      (s) =>
                        (s.deviceName &&
                          (s.type !== 'TEL' || s.serialNumber)) ||
                        s.deviceName ||
                        s.deviceName2 ||
                        s.extraDevices?.length
                    ) ? (
                      <ul className="list-disc pl-4">
                        {order.services.map((s) => (
                          <div key={s.id}>
                            {/* Primary device */}
                            {s.deviceName &&
                              (s.type !== 'TEL' || s.serialNumber) && (
                                <li>
                                  {s.deviceType &&
                                    devicesTypeMap[
                                      s.deviceType
                                    ].toUpperCase()}{' '}
                                  {s.deviceName.toUpperCase()}
                                  {s.serialNumber &&
                                    ` (SN: ${s.serialNumber.toUpperCase()})`}
                                </li>
                              )}

                            {/* Secondary device */}
                            {s.deviceName2 && (
                              <li className="ml-4">
                                {s.deviceName2.toUpperCase()}
                                {s.serialNumber2 &&
                                  ` (SN: ${s.serialNumber2.toUpperCase()})`}
                              </li>
                            )}

                            {/* Extra devices */}
                            {s.extraDevices?.length > 0 &&
                              s.extraDevices.map((ex) => (
                                <li key={ex.id} className="ml-4">
                                  {ex.name?.toUpperCase()}
                                  {ex.serialNumber &&
                                    ` (SN: ${ex.serialNumber.toUpperCase()})`}
                                </li>
                              ))}
                          </div>
                        ))}

                        {/* Include also assigned equipment (SERVICE/OUTAGE) */}
                        {order.assignedEquipment
                          ?.filter(
                            (e) => e.warehouse.status === 'ASSIGNED_TO_ORDER'
                          )
                          .map((item) => (
                            <li key={item.id}>
                              {item.warehouse.name.toUpperCase()}
                              {item.warehouse.serialNumber &&
                                ` (SN: ${item.warehouse.serialNumber.toUpperCase()})`}
                            </li>
                          ))}
                      </ul>
                    ) : order.assignedEquipment?.filter(
                        (e) => e.warehouse.status === 'ASSIGNED_TO_ORDER'
                      ).length ? (
                      <ul className="list-disc pl-4">
                        {order.assignedEquipment
                          .filter(
                            (e) => e.warehouse.status === 'ASSIGNED_TO_ORDER'
                          )
                          .map((item) => (
                            <li key={item.id}>
                              {item.warehouse.name.toUpperCase()}
                              {item.warehouse.serialNumber &&
                                ` (SN: ${item.warehouse.serialNumber.toUpperCase()})`}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>

                  {/* --- Collected from client --- */}
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Sprzęt odebrany od klienta
                    </h3>
                    {order.assignedEquipment?.filter(
                      (e) => e.warehouse.status === 'COLLECTED_FROM_CLIENT'
                    ).length ? (
                      <ul className="list-disc pl-4">
                        {order.assignedEquipment
                          .filter(
                            (e) =>
                              e.warehouse.status === 'COLLECTED_FROM_CLIENT'
                          )
                          .map((item) => (
                            <li key={item.id}>
                              {item.warehouse.name.toUpperCase()}
                              {item.warehouse.serialNumber &&
                                ` (SN: ${item.warehouse.serialNumber.toUpperCase()})`}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>

                  {/* --- Materials --- */}
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

                  {/* --- Total --- */}
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

              {/* --- Not completed --- */}
              {order.status === 'NOT_COMPLETED' && (
                <section className="pt-3">
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Powód niewykonania
                  </h3>
                  <p>{order.failureReason || '—'}</p>
                </section>
              )}

              <OrderTimeline order={order} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --- Modals --- */}
      {order && (
        <EditOrderModal
          open={showEditModal}
          onCloseAction={() => setShowEditModal(false)}
          order={order}
        />
      )}

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        description={`Czy na pewno chcesz usunąć zlecenie "${order?.orderNumber}"? Tej operacji nie można cofnąć.`}
      />
    </>
  )
}

export default OrderDetailsSheet
