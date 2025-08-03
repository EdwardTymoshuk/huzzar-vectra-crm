'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import TransferOrderModal from './TransferOrderModal'
import CompleteOrderModal from './completeOrder/CompleteOrderModal'

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
  /* fetch full order */
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: orderId,
  })

  /* local modal state */
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (autoOpen && !showCompleteModal) {
      setShowCompleteModal(true)
    }
  }, [autoOpen, showCompleteModal])

  useEffect(() => {
    if (autoOpen) {
      setShowCompleteModal(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpen])

  /* async states */
  if (isLoading) return <LoaderSpinner />
  if (isError || !data)
    return <p className="text-destructive">Błąd ładowania danych.</p>
  /* ---------- render ---------- */
  return (
    <div className="space-y-6 text-sm bg-card text-card-foreground p-4 rounded-lg">
      {/* transfer alert */}
      {pendingMessage && (
        <Alert variant="destructive" className="!pl-3">
          <AlertDescription>{pendingMessage}</AlertDescription>
        </Alert>
      )}

      <OrderDetailsContent order={data} hideTechnician={true} />

      {/* incoming transfer buttons */}
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

      {/* standard action buttons */}
      {orderStatus === 'ASSIGNED' && !disableTransfer && !incomingTransfer && (
        <div className="flex gap-2">
          <Button variant="success" onClick={() => setShowCompleteModal(true)}>
            <BsSendCheck />
            Odpisz
          </Button>
          <Button variant="default" onClick={() => setShowTransfer(true)}>
            <CgArrowsExchange />
            Przekaż
          </Button>
        </div>
      )}

      {/* transfer modal */}
      <TransferOrderModal
        open={showTransfer}
        orderId={orderId}
        onClose={() => setShowTransfer(false)}
      />

      {/* complete modal */}
      <CompleteOrderModal
        open={showCompleteModal}
        order={data}
        onCloseAction={() => {
          setShowCompleteModal(false)
          queryClient.invalidateQueries(['order.getOrderById'])
        }}
        orderType={data.type}
      />
    </div>
  )
}

export default TechnicianOrderDetails
