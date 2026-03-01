'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Button } from '@/app/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { materialUnitMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MdDelete } from 'react-icons/md'
import CompleteOplOrderWizard from '../../(technician)/components/orders/completeOrder/CompleteOplOrderWizard'
import OrderStatusBadge from '../../../../components/order/OrderStatusBadge'
import OplOrderTimeline from '../../admin-panel/components/order/OplOrderTimeline'
import EditOplOrderModal from '../../admin-panel/components/orders/EditOplOrderModal'
import {
  oplDevicesTypeMap,
  oplNetworkMap,
  oplOrderTypeMap,
  oplTimeSlotMap,
} from '../../lib/constants'
import { CompleteOplOrderProvider } from '../../utils/context/order/CompleteOplOrderContext'
import {
  isPkiCode,
  shouldShowWorkCodeQuantity,
  toWorkCodeLabel,
} from '../../utils/order/workCodesPresentation'
import { parseMeasurementsFromNotes } from '../../utils/order/notesFormatting'

type Props = {
  orderId: string | null
  onClose: () => void
  open: boolean
}

const OplOrderDetailsSheet = ({ orderId, onClose, open }: Props) => {
  const { isTechnician, isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()
  const [activeOrderId, setActiveOrderId] = useState<string | null>(orderId)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [addressNoteToDelete, setAddressNoteToDelete] = useState<{
    id: string
    note: string
  } | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdminEdit, setShowAdminEdit] = useState(false)

  useEffect(() => {
    if (!open) return
    setActiveOrderId(orderId)
  }, [open, orderId])

  const {
    data: order,
    isLoading,
    isError,
  } = trpc.opl.order.getOrderById.useQuery(
    { id: activeOrderId ?? '' },
    { enabled: !!activeOrderId },
  )

  const { data: addressNotes = [] } =
    trpc.opl.order.getAddressNotesForOrder.useQuery(
      { orderId: activeOrderId ?? '' },
      { enabled: !!activeOrderId && open },
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

  const deleteAddressNoteMutation = trpc.opl.order.deleteAddressNote.useMutation({
    onSuccess: async () => {
      toast.success('Uwaga do adresu została usunięta.')
      if (activeOrderId) {
        await utils.opl.order.getAddressNotesForOrder.invalidate({
          orderId: activeOrderId,
        })
      }
      await utils.opl.order.searchAddressNotes.invalidate()
      setAddressNoteToDelete(null)
    },
    onError: () => {
      toast.error('Nie udało się usunąć uwagi do adresu.')
    },
  })

  const handleDelete = () => {
    if (!order) return
    deleteMutation.mutate({ id: order.id })
  }

  const assignedToThisOrder =
    order?.assignedEquipment?.filter((e) =>
      e.warehouse.history?.some(
        (h) =>
          h.assignedOrderId === order.id &&
          (h.action === 'ASSIGNED_TO_ORDER' || h.action === 'ISSUED_TO_CLIENT'),
      ),
    ) ?? []

  const collectedFromClient =
    order?.assignedEquipment?.filter((e) =>
      e.warehouse.history?.some(
        (h) =>
          h.assignedOrderId === order.id &&
          h.action === 'COLLECTED_FROM_CLIENT',
      ),
    ) ?? []
  const workCodes =
    order?.settlementEntries?.filter((e) => !isPkiCode(e.code)) ?? []
  const pkiCodes =
    order?.settlementEntries?.filter((e) => isPkiCode(e.code)) ?? []
  const parsedNotes = parseMeasurementsFromNotes(order?.notes)
  const measurementLabel = parsedNotes.measurements.opp || parsedNotes.measurements.go
    ? `OPP: ${parsedNotes.measurements.opp || '-'} dB, GO: ${parsedNotes.measurements.go || '-'} dB`
    : null
  const technicianCount = Math.max(order?.assignments?.length ?? 1, 1)
  const totalAmount =
    order?.settlementEntries?.reduce(
      (acc, e) => acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
      0,
    ) ?? 0
  const amountPerTechnician = totalAmount / technicianCount

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
                      variant="default"
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
                    Adres
                  </h3>
                  <p>
                    {order.city}, {order.street}
                    {order.postalCode &&
                      order.postalCode !== '00-000' &&
                      ` (${order.postalCode})`}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Typ zlecenia
                  </h3>
                  <p>{oplOrderTypeMap[order.type] ?? order.type}</p>
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
                      Przypisani technicy
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
                  <p>{order.operator?.trim() || '-'}</p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Operator sieci
                  </h3>
                  <p>{oplNetworkMap[order.network] ?? order.network}</p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Standard zlecenia
                  </h3>
                  <p>{order.standard ?? '—'}</p>
                </div>

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Sprzęty do wydania
                  </h3>
                  {order.equipmentRequirements?.length ? (
                    <ul className="list-disc pl-4 normal-case">
                      {order.equipmentRequirements.map((req) => (
                        <li key={req.id}>
                          {req.deviceDefinition.name}{' '}
                          {req.deviceDefinition.category && (
                            <span>
                              (
                              {oplDevicesTypeMap[req.deviceDefinition.category]}
                              )
                            </span>
                          )}{' '}
                          x {req.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Brak</p>
                  )}
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
                  <p className="whitespace-pre-line normal-case">
                    {parsedNotes.plainNotes || '—'}
                  </p>
                </div>

                {measurementLabel && (
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Pomiar
                    </h3>
                    <p>{measurementLabel}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs text-muted-foreground font-medium">
                    Uwagi do adresu
                  </h3>
                  {addressNotes.length ? (
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full normal-case"
                    >
                      <AccordionItem
                        value="address-notes"
                        className="border rounded border-border px-2"
                      >
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
                          {`Pokaż uwagi (${addressNotes.length})`}
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <ul className="space-y-2">
                            {addressNotes.map((n) => (
                              <li
                                key={n.id}
                                className={cn(
                                  'rounded border p-2',
                                  n.scopeMatches
                                    ? 'border-border'
                                    : 'border-dashed border-muted-foreground/40'
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="flex-1">{n.note}</p>
                                  {isAdmin && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        setAddressNoteToDelete({
                                          id: n.id,
                                          note: n.note,
                                        })
                                      }
                                    >
                                      <MdDelete className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {`Adres wpisu: ${n.city}, ${n.street}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {!n.scopeMatches
                                    ? 'Inny zakres ulicy • '
                                    : ''}
                                  {n.buildingScope
                                    ? `Zakres: ${n.buildingScope} • `
                                    : ''}
                                  {n.createdBy.name} •{' '}
                                  {new Date(n.createdAt).toLocaleString(
                                    'pl-PL'
                                  )}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <p>—</p>
                  )}
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
                        {workCodes.map((entry) => (
                          <li key={entry.id}>
                            {toWorkCodeLabel(entry.code)}
                            {shouldShowWorkCodeQuantity(
                              entry.code,
                              entry.quantity,
                            )
                              ? ` x ${entry.quantity}`
                              : ''}{' '}
                            ({entry.rate?.amount?.toFixed(2) ?? '0.00'} zł)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Brak</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      PKI
                    </h3>
                    {pkiCodes.length ? (
                      <ul className="list-disc pl-4">
                        {pkiCodes.map((entry) => (
                          <li key={entry.id}>
                            {toWorkCodeLabel(entry.code)} x {entry.quantity}
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
                  <div>
                    <h3 className="text-xs text-muted-foreground font-medium">
                      Sprzęt wydany w ramach zlecenia
                    </h3>
                    {assignedToThisOrder.length ? (
                      <ul className="list-disc pl-4 normal-case">
                        {assignedToThisOrder.map((item) => (
                          <li key={item.id}>
                            {item.warehouse.category && (
                              <span className="font-medium">
                                {
                                  oplDevicesTypeMap[item.warehouse.category]
                                }{' '}
                              </span>
                            )}
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
                    {collectedFromClient.length ? (
                      <ul className="list-disc pl-4">
                        {collectedFromClient.map((item) => (
                          <li key={item.id}>
                            {item.warehouse.category && (
                              <span className="font-medium">
                                {
                                  oplDevicesTypeMap[item.warehouse.category]
                                }{' '}
                              </span>
                            )}
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
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">
                      {isTechnician ? 'Kwota : ' : 'Kwota: '}
                      {(isTechnician
                        ? amountPerTechnician
                        : totalAmount
                      ).toFixed(2)}{' '}
                      zł
                    </div>
                    {!isTechnician &&
                      order.assignments.map((assignment, idx) => (
                        <p
                          key={`${assignment.technicianId}-${idx}`}
                          className="text-xs text-muted-foreground normal-case"
                        >
                          {assignment.technician.user.name}:{' '}
                          {amountPerTechnician.toFixed(2)} zł
                        </p>
                      ))}
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

              <OplOrderTimeline
                order={order}
                onOpenOrder={(nextOrderId) => {
                  setShowDeleteDialog(false)
                  setShowEditModal(false)
                  setShowAdminEdit(false)
                  setActiveOrderId(nextOrderId)
                }}
              />
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
        <CompleteOplOrderProvider orderId={order.id}>
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
        </CompleteOplOrderProvider>
      )}

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        description={`Czy na pewno chcesz usunąć zlecenie "${order?.orderNumber}"? Tej operacji nie można cofnąć.`}
      />

      <ConfirmDeleteDialog
        open={!!addressNoteToDelete}
        onClose={() => setAddressNoteToDelete(null)}
        onConfirm={async () => {
          if (!addressNoteToDelete) return
          await deleteAddressNoteMutation.mutateAsync({
            id: addressNoteToDelete.id,
          })
        }}
        description={`Czy na pewno chcesz usunąć tę uwagę do adresu?${
          addressNoteToDelete?.note
            ? ` "${addressNoteToDelete.note.slice(0, 120)}${
                addressNoteToDelete.note.length > 120 ? '…' : ''
              }"`
            : ''
        }`}
      />
    </>
  )
}

export default OplOrderDetailsSheet
