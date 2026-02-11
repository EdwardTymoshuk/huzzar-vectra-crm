'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { materialUnitMap } from '@/lib/constants'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import CompleteOplOrderWizard from '../../(technician)/components/orders/completeOrder/CompleteOplOrderWizard'
import OrderStatusBadge from '../../../../components/order/OrderStatusBadge'
import OplOrderTimeline from '../../admin-panel/components/order/OplOrderTimeline'
import EditOplOrderModal from '../../admin-panel/components/orders/EditOplOrderModal'
import { oplOrderTypeMap, oplTimeSlotMap } from '../../lib/constants'

type Props = {
  orderId: string | null
  onClose: () => void
  open: boolean
}

const OplOrderDetailsSheet = ({ orderId, onClose, open }: Props) => {
  const { isTechnician, isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdminEdit, setShowAdminEdit] = useState(false)

  const {
    data: order,
    isLoading,
    isError,
  } = trpc.opl.order.getOrderById.useQuery(
    { id: orderId ?? '' },
    { enabled: !!orderId }
  )

  const deleteMutation = trpc.opl.order.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało pomyślnie usunięte.')
      utils.opl.order.getTechnicianActiveOrders.invalidate()
      utils.opl.order.getAssignedOrders.invalidate()
      utils.opl.order.getUnassignedOrders.invalidate()
      setShowDeleteDialog(false)
      onClose()
    },
    onError: (err) => {
      if (err.data?.code === 'NOT_FOUND')
        toast.error('Zlecenie już nie istnieje.')
      else if (err.data?.code === 'BAD_REQUEST')
        toast.error('Nie można usunąć wykonanego zlecenia.')
      else if (err.data?.code === 'CONFLICT')
        toast.error('Zlecenie powiązane z innymi rekordami.')
      else toast.error('Nieoczekiwany błąd podczas usuwania.')

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

            {/* ADMIN + COORDINATOR ACTIONS */}
            {!isTechnician && order && (
              <div className="flex gap-2 w-fit justify-center mt-2">
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
                {(isAdmin || isCoordinator) &&
                  order.status !== 'COMPLETED' &&
                  order.status !== 'NOT_COMPLETED' && (
                    <Button
                      variant="warning"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAdminEdit(true)}
                    >
                      Odpisz zlecenie
                    </Button>
                  )}
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
            <div className="space-y-5 text-sm uppercase divide-y divide-border">
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
                  <p>{oplOrderTypeMap[order.type] ?? order.type}</p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Id usługi
                  </h3>
                  <p>{order.serviceId ? order.serviceId : '-'}</p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Przedział czasowy
                  </h3>
                  <p>{oplTimeSlotMap[order.timeSlot] ?? order.timeSlot}</p>
                </div>

                {!isTechnician && (
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Technik
                    </h3>

                    {order.assignments.length === 0 ? (
                      <p>Nieprzypisany</p>
                    ) : (
                      <p>
                        {order.assignments
                          .map((a) => a.technician.user.name)
                          .join(' + ')}
                      </p>
                    )}
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
                  {/* <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Uruchomione usługi
                    </h3>
                    {order.services?.length ? (
                      <ul className="list-disc pl-4">
                        {Object.entries(
                          order.services.reduce(
                            (
                              acc: Record<
                                string,
                                { count: number; notes: string[] }
                              >,
                              s
                            ) => {
                              if (!acc[s.type]) {
                                acc[s.type] = { count: 0, notes: [] }
                              }
                              acc[s.type].count += 1
                              if (s.notes) acc[s.type].notes.push(s.notes)
                              return acc
                            },
                            {}
                          )
                        ).map(([type, data]) => (
                          <li key={type} className="mt-1">
                            <span className="font-medium">
                              {type} × {data.count}
                            </span>

                            {/* Notes (if any) */}
                  {/* {data.notes.length > 0 && (
                              <ul className="ml-4 mt-1 text-xs text-muted-foreground space-y-1">
                                {data.notes.map((n, i) => (
                                  <li key={i}>Komentarz: {n}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>  */}

                  {/* --- Issued equipment (merged + deduplicated) --- */}
                  {false && (
                    <div>
                      <h3 className="text-xs text-muted-foreground font-medium">
                        Sprzęt wydany w ramach zlecenia
                      </h3>

                      {(() => {
                        /** ---------------------------------------------------------
                         * 3. Merge and deduplicate by (name + serial)
                         * --------------------------------------------------------- */
                        // const merged = collectOrderEquipment(order)
                        // /** ---------------------------------------------------------
                        //  * 4. Render
                        //  * --------------------------------------------------------- */
                        // if (merged.length === 0) return <p>Brak</p>
                        // return (
                        //   <ul className="list-disc pl-4">
                        //     {merged.map((item) => (
                        //       <li key={item.id}>
                        //         {/* Category */}
                        //         {item.category && (
                        //           <span className="font-medium">
                        //             {item.displayCategory}{' '}
                        //           </span>
                        //         )}
                        //         {/* Name */}
                        //         {item.name.toUpperCase()}
                        //         {/* Serial */}
                        //         {item.serial &&
                        //           ` (SN: ${item.serial.toUpperCase()})`}
                        //       </li>
                        //     ))}
                        //   </ul>
                        // )
                      })()}
                    </div>
                  )}
                  {/* --- Collected from client --- */}
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Sprzęt odebrany od klienta
                    </h3>

                    {/* {order.assignedEquipment?.filter((e) =>
                      e.warehouse.history?.some(
                        (h) => h.action === 'COLLECTED_FROM_CLIENT'
                      )
                    ).length ? (
                      <ul className="list-disc pl-4">
                        {order.assignedEquipment
                          .filter((e) =>
                            e.warehouse.history?.some(
                              (h) => h.action === 'COLLECTED_FROM_CLIENT'
                            )
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
                    )} */}
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
                            {m.material.name} – {m.quantity}{' '}
                            {materialUnitMap[m.unit]}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>

                  {/* --- Total --- */}
                  {/* <div className="font-semibold text-sm">
                    Kwota:{' '}
                    {order.settlementEntries
                      .reduce(
                        (acc, e) =>
                          acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
                        0
                      )
                      .toFixed(2)}{' '}
                    zł
                  </div> */}
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

              <OplOrderTimeline order={order} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --- Modals --- */}
      {order && (
        <EditOplOrderModal
          open={showEditModal}
          onCloseAction={() => setShowEditModal(false)}
          orderId={order.id}
        />
      )}

      {order && (
        <CompleteOplOrderWizard
          open={showAdminEdit}
          onCloseAction={() => setShowAdminEdit(false)}
          order={order}
          orderType={order.type}
          materialDefs={[]}
          techMaterials={[]}
          devices={[]}
          mode="adminEdit"
          workCodeDefs={[]}
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

export default OplOrderDetailsSheet
