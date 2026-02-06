'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { formatDate } from '@/utils/dates/formatDateTime'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus, OplOrderType, OplTimeSlot } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import { MdVisibility } from 'react-icons/md'
import { toast } from 'sonner'
import OplOrderDetailsSheet from '../../../components/order/OplOrderDetailsSheet'
import { oplOrderTypeMap } from '../../../lib/constants'
import TransferOplOrderModal from '../orders/TransferOplOrderModal'

interface Props {
  searchTerm: string
  autoOpenOrderId?: string
  onAutoOpenHandled?: () => void
}

export type ActiveOrderRow = {
  id: string
  orderNumber: string
  type: OplOrderType
  city: string
  street: string
  date: Date
  timeSlot: OplTimeSlot
  operator: string
  status: OplOrderStatus
  notes: string | null
  technicians: {
    id: string
    name: string
  }[]
}

/** Narrow type for incoming transfers returned by getIncomingTransfers */
type IncomingTransferRow = {
  id: string
  orderNumber: string
  type: OplOrderType | null
  city: string
  street: string
  date: Date
  timeSlot: OplTimeSlot
  operator: string | null
  status: OplOrderStatus
  transferToId: string | null
  transferPending: boolean
}

/** Unified UI row model used by the Planner list (active + incoming transfers). */
type PlannerRow = {
  id: string
  orderNumber: string
  type: OplOrderType
  city: string
  street: string
  date: Date
  timeSlot: OplTimeSlot
  operator: string
  status: OplOrderStatus
  /** When true, row represents an incoming transfer waiting for acceptance. */
  incoming: boolean
}

const TechnicianOplPlanerTable = ({
  searchTerm,
  autoOpenOrderId,
  onAutoOpenHandled,
}: Props) => {
  /** Local UI state for modals / sheets */
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState<string | null>(null)
  const [showComplete, setShowComplete] = useState<string | null>(null)

  /* ---------------------- Data fetching ---------------------- */
  // Active (unrealized) orders for selected day
  const {
    data: activeOrders = [],
    isLoading: activeLoading,
    isError: activeError,
  } = trpc.opl.order.getTechnicianActiveOrders.useQuery()

  // Incoming transfers to the logged-in technician
  const {
    data: incomingTransfers = [],
    isLoading: incomingLoading,
    isError: incomingError,
  } = trpc.opl.order.getIncomingTransfers.useQuery(undefined, {
    staleTime: 30_000,
  })

  // Full order (lazy) when opening complete wizard
  const { data: fullOrder } = trpc.opl.order.getOrderById.useQuery(
    { id: showComplete ?? '' },
    { enabled: !!showComplete }
  )

  // Dictionaries for CompleteOrderWizard
  const { data: materialDefs } =
    trpc.opl.settings.getAllOplMaterialDefinitions.useQuery()
  const { data: workCodeDefs } = trpc.opl.settings.getAllOplRates.useQuery()
  const { data: techMaterials } =
    trpc.opl.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
      itemType: 'MATERIAL',
    })
  const { data: techDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })

  const utils = trpc.useUtils()

  /* ---------------------- Mutations (transfers) ---------------------- */
  const accept = trpc.opl.order.confirmTransfer.useMutation({
    onSuccess: () => {
      utils.opl.order.getTechnicianActiveOrders.invalidate()
      utils.opl.order.getIncomingTransfers.invalidate()
      toast.success('Zlecenie zostało przyjęte.')
    },
  })

  const reject = trpc.opl.order.rejectTransfer.useMutation({
    onSuccess: () => {
      utils.opl.order.getTechnicianActiveOrders.invalidate()
      utils.opl.order.getIncomingTransfers.invalidate()
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
        type: (t.type ?? 'SERVICE') as OplOrderType,
        city: t.city,
        street: t.street,
        date: t.date,
        timeSlot: t.timeSlot,
        operator: t.operator ?? '—',
        status: 'ASSIGNED',
        incoming: true,
      })
    )

    // Merge incoming + active
    const merged = [...inc, ...base]

    // ✅ Sort newest first (descending by date)
    merged.sort((a, b) => {
      const diff = b.date.getTime() - a.date.getTime()
      if (diff !== 0) return diff
      return a.timeSlot.localeCompare(b.timeSlot)
    })

    return merged
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
    <div className="flex flex-col gap-3 uppercase">
      {filtered.map((o) => (
        <Card
          key={o.id}
          className={`shadow-sm border rounded-xl space-y-4 ${
            o.incoming ? 'opacity-60' : ''
          }`}
        >
          <CardHeader className="pb-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground tracking-wide">
                      {oplOrderTypeMap[o.type] ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {o.operator}
                    </span>
                  </div>

                  <div className="flex flex-col items-end text-sm text-muted-foreground">
                    {/* Data */}
                    <span>{formatDate(o.date)}</span>
                    <span>{getTimeSlotLabel(o.timeSlot)}</span>
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm">
            {/* Basic order info */}
            <div className="text-base font-semibold">
              {' '}
              <Highlight
                searchWords={[searchTerm]}
                textToHighlight={o.orderNumber}
              />
            </div>
            <div className="text-base font-semibold">
              <Highlight
                searchWords={[searchTerm]}
                textToHighlight={`${o.city}, ${o.street}`}
              />
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
              {!o.incoming && o.status === OplOrderStatus.ASSIGNED && (
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
                variant="outline"
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
      <OplOrderDetailsSheet
        orderId={openOrderId}
        open={!!openOrderId}
        onClose={() => setOpenOrderId(null)}
      />

      {/* Transfer modal */}
      <TransferOplOrderModal
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
      {/* {showComplete && fullOrder && (
        <CompleteOrderWizard
          open
          order={fullOrder}
          orderType={fullOrder.type}
          onCloseAction={async () => {
            setShowComplete(null)
            await utils.opl.order.getTechnicianActiveOrders.invalidate()
            await utils.opl.order.getOrderById.invalidate({
              id: fullOrder.id,
            })
          }}
          materialDefs={materialDefs ?? []}
          techMaterials={mappedMaterials}
          devices={mappedDevices}
          workCodeDefs={workCodeDefs}
        />
      )} */}
    </div>
  )
}

export default TechnicianOplPlanerTable
