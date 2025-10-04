'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { differenceInMinutes } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import { MdEdit } from 'react-icons/md'
import TransferOrderModal from './TransferOrderModal'
import CompleteOrderModal from './completeOrder/CompleteOrderModal'

/* -------------------------------------------------- */
/* Props                                               */
/* -------------------------------------------------- */
interface Props {
  orderId: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  orderStatus: OrderStatus
  disableTransfer?: boolean
  incomingTransfer?: boolean
  pendingMessage?: string
  onAccept?: () => void
  onReject?: () => void
}

/* -------------------------------------------------- */
/* Component                                          */
/* -------------------------------------------------- */
const TechnicianOrderDetails = ({
  orderId,
  autoOpen,
  onAutoOpenHandled,
  orderStatus,
  disableTransfer = false,
  incomingTransfer,
  pendingMessage,
  onAccept,
  onReject,
}: Props) => {
  /* Fetch full order payload for contextual decisions (completedAt, etc.). */
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: orderId,
  })

  /* Read role flags on client for UX-only gating (server enforces final auth). */
  const { isAdmin, isCoordinator, isWarehouseman, isTechnician } = useRole()

  /* Local modal flags. */
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  /* Prefer trpc utils for safe cache invalidation keys. */
  const utils = trpc.useUtils()

  /* Auto-open Complete modal when requested by parent (e.g., deep-link). */
  useEffect(() => {
    if (autoOpen) {
      setShowCompleteModal(true)
      onAutoOpenHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen])

  /* Determine whether we can show the "Amend" button.
   * - For admins/coordinators: always when order is COMPLETED/NOT_COMPLETED.
   * - For technicians: same status + within 15 minutes from completedAt. */
  const canShowAmendButton = useMemo(() => {
    const isEnded =
      orderStatus === OrderStatus.COMPLETED ||
      orderStatus === OrderStatus.NOT_COMPLETED
    if (!isEnded) return false
    if (isAdmin || isCoordinator) return true

    // For technician: check 15 min window
    if (isTechnician && data?.completedAt) {
      const diff = differenceInMinutes(new Date(), new Date(data.completedAt))
      return diff <= 15
    }
    return false
  }, [orderStatus, isAdmin, isCoordinator, isTechnician, data?.completedAt])

  /* Async states */
  if (isLoading)
    return (
      <div className="w-full flex justify-center">
        <LoaderSpinner />
      </div>
    )
  if (isError || !data)
    return <p className="text-destructive">Błąd ładowania danych.</p>

  /* Render */
  return (
    <div className="space-y-6 text-sm bg-card text-card-foreground p-4 rounded-lg">
      {/* Transfer alert if present */}
      {pendingMessage && (
        <Alert variant="destructive" className="!pl-3">
          <AlertDescription>{pendingMessage}</AlertDescription>
        </Alert>
      )}

      {/* Read-only order details content */}
      <OrderDetailsContent order={data} hideTechnician={true} />

      {/* Transfer actions for incoming transfer */}
      {incomingTransfer && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={onAccept}>
            Akceptuj
          </Button>
          <Button size="sm" variant="secondary" onClick={onReject}>
            Odrzuć
          </Button>
        </div>
      )}

      {/* Standard actions (tech flow) */}
      {!disableTransfer && !incomingTransfer && (
        <>
          {orderStatus === OrderStatus.ASSIGNED ? (
            <div className="flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowCompleteModal(true)}
              >
                <BsSendCheck />
                Odpisz
              </Button>
              <Button variant="default" onClick={() => setShowTransfer(true)}>
                <CgArrowsExchange />
                Przekaż
              </Button>
            </div>
          ) : (
            /* Amend button (visible based on role/time); warehouseman never edits. */
            canShowAmendButton &&
            !isWarehouseman && (
              <div className="flex gap-2">
                <Button
                  variant="success"
                  onClick={() => setShowCompleteModal(true)}
                >
                  <MdEdit />
                  Edytuj / uzupełnij odpis
                </Button>
              </div>
            )
          )}
        </>
      )}

      {/* Transfer modal */}
      <TransferOrderModal
        open={showTransfer}
        orderId={orderId}
        onClose={() => setShowTransfer(false)}
      />

      {/* Complete/Amend modal (single UI for both flows) */}
      <CompleteOrderModal
        open={showCompleteModal}
        order={data}
        onCloseAction={async () => {
          setShowCompleteModal(false)
          // Invalidate both list and details for fresh view.
          await utils.order.getOrders.invalidate()
          await utils.order.getOrderById.invalidate({ id: orderId })
        }}
        orderType={data.type}
        mode={
          orderStatus === OrderStatus.ASSIGNED ? 'complete' : ('amend' as const)
        }
      />
    </div>
  )
}

export default TechnicianOrderDetails
