'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { orderTypeMap } from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { trpc } from '@/utils/trpc'
import { OrderStatus, OrderType, Prisma, TimeSlot } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import { MdVisibility } from 'react-icons/md'
import { toast } from 'sonner'
import TransferOrderModal from '../orders/TransferOrderModal'
import CompleteOrderWizard from '../orders/completeOrder/CompleteOrderWizard'

interface Props {
  searchTerm: string
  selectedDate: Date
  autoOpenOrderId?: string
  onAutoOpenHandled?: () => void
}

/** Narrow type for active technician orders returned by getTechnicianActiveOrders */
type ActiveOrderRow = Prisma.OrderGetPayload<{
  select: {
    id: true
    orderNumber: true
    type: true
    city: true
    street: true
    date: true
    timeSlot: true
    operator: true
    status: true
    assignedTo: { select: { id: true; name: true } }
    notes: true
  }
}>

/** Narrow type for incoming transfers returned by getIncomingTransfers */
type IncomingTransferRow = {
  id: string
  orderNumber: string
  type: OrderType | null
  city: string
  street: string
  date: Date
  timeSlot: TimeSlot
  operator: string | null
  status: OrderStatus
  assignedTo: { id: string; name: string } | null
  transferToId: string | null
  transferPending: boolean
}

/** Unified UI row model used by the Planner list (active + incoming transfers). */
type PlannerRow = {
  id: string
  orderNumber: string
  type: OrderType
  city: string
  street: string
  date: Date
  timeSlot: TimeSlot
  operator: string
  status: OrderStatus
  /** When true, row represents an incoming transfer waiting for acceptance. */
  incoming: boolean
}

const TechnicianPlanerTable = ({
  searchTerm,
  selectedDate,
  autoOpenOrderId,
  onAutoOpenHandled,
}: Props) => {
  /** Local UI state for modals / sheets */
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState<string | null>(null)
  const [showComplete, setShowComplete] = useState<string | null>(null)

  /** Selected day formatted as yyyy-MM-dd for TRPC input */
  const date = selectedDate.toLocaleDateString('en-CA')

  /* ---------------------- Data fetching ---------------------- */
  // Active (unrealized) orders for selected day
  const {
    data: activeOrders = [],
    isLoading: activeLoading,
    isError: activeError,
  } = trpc.order.getTechnicianActiveOrders.useQuery({ date })

  // Incoming transfers to the logged-in technician
  const {
    data: incomingTransfers = [],
    isLoading: incomingLoading,
    isError: incomingError,
  } = trpc.order.getIncomingTransfers.useQuery(undefined, { staleTime: 30_000 })

  // Full order (lazy) when opening complete wizard
  const { data: fullOrder } = trpc.order.getOrderById.useQuery(
    { id: showComplete ?? '' },
    { enabled: !!showComplete }
  )

  // Dictionaries for CompleteOrderWizard
  const { data: materialDefs } = trpc.materialDefinition.getAll.useQuery()
  const { data: workCodeDefs } = trpc.rateDefinition.getAllRates.useQuery()
  const { data: techMaterials } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'MATERIAL',
  })
  const { data: techDevices } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })

  const utils = trpc.useUtils()

  /* ---------------------- Mutations (transfers) ---------------------- */
  const accept = trpc.order.confirmTransfer.useMutation({
    onSuccess: () => {
      utils.order.getTechnicianActiveOrders.invalidate()
      utils.order.getIncomingTransfers.invalidate()
      toast.success('Zlecenie zostało przyjęte.')
    },
  })

  const reject = trpc.order.rejectTransfer.useMutation({
    onSuccess: () => {
      utils.order.getTechnicianActiveOrders.invalidate()
      utils.order.getIncomingTransfers.invalidate()
      toast.info('Zlecenie zostało odrzucone.')
    },
  })

  /** Automatically open CompleteOrderWizard after new order is created */
  useEffect(() => {
    if (autoOpenOrderId) {
      setShowComplete(autoOpenOrderId)
      onAutoOpenHandled?.()
    }
  }, [autoOpenOrderId, onAutoOpenHandled])

  /* ---------------------- Merge active + incoming ---------------------- */
  /**
   * Normalize and merge rows into a single UI list:
   * - Active orders (PENDING / ASSIGNED) → incoming=false
   * - Incoming transfers (ASSIGNED + transferPending) → incoming=true
   */
  const rows: PlannerRow[] = useMemo(() => {
    const base: PlannerRow[] = (activeOrders as ActiveOrderRow[]).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      type: o.type,
      city: o.city,
      street: o.street,
      date: o.date,
      timeSlot: o.timeSlot,
      operator: o.operator || '—',
      status: o.status,
      incoming: false,
    }))

    const inc: PlannerRow[] = (incomingTransfers as IncomingTransferRow[]).map(
      (t) => ({
        id: t.id,
        orderNumber: t.orderNumber,
        type: (t.type ?? 'SERVICE') as OrderType,
        city: t.city,
        street: t.street,
        date: t.date,
        timeSlot: t.timeSlot,
        operator: t.operator ?? '—',
        status: 'ASSIGNED',
        incoming: true,
      })
    )

    // Prefer to display incoming items first for visibility, then active
    return [...inc, ...base]
  }, [activeOrders, incomingTransfers])

  /* ---------------------- Client-side search ---------------------- */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return rows.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        `${o.city} ${o.street}`.toLowerCase().includes(q)
    )
  }, [rows, searchTerm])

  /* ---------------------- Map technician stock for wizard ---------------------- */
  const mappedMaterials =
    techMaterials
      ?.filter((m) => !!m.materialDefinitionId)
      .map((m) => ({
        id: m.id,
        name: m.name,
        materialDefinitionId: m.materialDefinitionId!,
        quantity: m.quantity ?? 0,
      })) ?? []

  const mappedDevices =
    techDevices
      ?.filter((d) => !!d.serialNumber)
      .map((d) => ({
        id: d.id,
        name: d.name,
        serialNumber: d.serialNumber ?? '',
        category: d.category ?? 'OTHER',
        type: 'DEVICE' as const,
      })) ?? []

  /* ---------------------- Loading & error states ---------------------- */
  if (activeLoading || incomingLoading)
    return (
      <div className="w-full flex justify-center py-8">
        <LoaderSpinner />
      </div>
    )

  if (activeError || incomingError)
    return (
      <p className="w-full py-8 text-center text-destructive">
        Błąd ładowania danych.
      </p>
    )

  if (filtered.length === 0)
    return (
      <p className="py-10 text-center text-muted-foreground">
        Brak aktywnych zleceń na ten dzień.
      </p>
    )

  /* ---------------------- Render ---------------------- */
  return (
    <div className="flex flex-col gap-3">
      {filtered.map((o) => (
        <Card
          key={o.id}
          className={`shadow-sm border rounded-xl ${
            o.incoming ? 'opacity-60' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-base font-semibold">
                <Highlight
                  searchWords={[searchTerm]}
                  textToHighlight={o.orderNumber}
                />
              </span>
              <span className="text-sm text-muted-foreground">
                {orderTypeMap[o.type] ?? '—'}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm space-y-2">
            {/* Basic order info */}
            <div>
              <strong>Adres:</strong>{' '}
              <Highlight
                searchWords={[searchTerm]}
                textToHighlight={`${o.city}, ${o.street}`}
              />
            </div>
            <div>
              <strong>Slot czasowy:</strong> {getTimeSlotLabel(o.timeSlot)}
            </div>
            <div>
              <strong>Operator:</strong> {o.operator}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3">
              {/* Accept / Reject for incoming transfers */}
              {o.incoming && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="success"
                    className="flex-1 sm:flex-none"
                    onClick={() => accept.mutate({ orderId: o.id })}
                    disabled={accept.isLoading}
                  >
                    Akceptuj
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                    onClick={() => reject.mutate({ orderId: o.id })}
                    disabled={reject.isLoading}
                  >
                    Odrzuć
                  </Button>
                </div>
              )}

              {/* Complete / Transfer for assigned, non-incoming */}
              {!o.incoming && o.status === OrderStatus.ASSIGNED && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    className="w-full sm:w-auto"
                    onClick={() => setShowComplete(o.id)}
                  >
                    <BsSendCheck className="mr-1" />
                    Odpisz
                  </Button>

                  <Button
                    size="sm"
                    variant="default"
                    className="w-full sm:w-auto"
                    onClick={() => setShowTransfer(o.id)}
                  >
                    <CgArrowsExchange className="mr-1" />
                    Przekaż
                  </Button>
                </>
              )}

              {/* Always available: details */}
              <Button
                size="sm"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setOpenOrderId(o.id)}
              >
                <MdVisibility className="mr-1" /> Szczegóły
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Details sheet */}
      <OrderDetailsSheet
        orderId={openOrderId}
        open={!!openOrderId}
        onClose={() => setOpenOrderId(null)}
      />

      {/* Transfer modal */}
      <TransferOrderModal
        open={!!showTransfer}
        orderId={showTransfer ?? ''}
        onClose={() => setShowTransfer(null)}
      />

      {/* Preloader overlay while fetching order for the wizard */}
      {showComplete && !fullOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <LoaderSpinner />
        </div>
      )}

      {/* Complete/Amend wizard */}
      {showComplete && fullOrder && (
        <CompleteOrderWizard
          open
          order={fullOrder}
          orderType={fullOrder.type}
          onCloseAction={async () => {
            setShowComplete(null)
            await utils.order.getTechnicianActiveOrders.invalidate()
            await utils.order.getOrderById.invalidate({ id: fullOrder.id })
          }}
          materialDefs={materialDefs ?? []}
          techMaterials={mappedMaterials}
          devices={mappedDevices}
          workCodeDefs={workCodeDefs}
        />
      )}
    </div>
  )
}

export default TechnicianPlanerTable
