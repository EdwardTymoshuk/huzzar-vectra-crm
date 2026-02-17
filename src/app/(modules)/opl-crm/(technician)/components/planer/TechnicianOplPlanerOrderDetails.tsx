'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { oplNetworkMap } from '@/app/(modules)/opl-crm/lib/constants'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { differenceInMinutes } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import { MdEdit } from 'react-icons/md'

interface Props {
  orderId: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  orderStatus: OplOrderStatus
  disableTransfer?: boolean
  incomingTransfer?: boolean
  pendingMessage?: string
  onAccept?: () => void
  onReject?: () => void
}

/**
 * TechnicianOplPlanerOrderDetails
 * - Lightweight variant for active (not yet completed) orders.
 * - Used only in the Planer page.
 * - Shows basic order info, notes, and action buttons (Complete / Transfer).
 */
const TechnicianOplPlanerOrderDetails = ({
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
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const { isAdmin, isCoordinator } = useRole()
  const utils = trpc.useUtils()

  // Fetch only the light order info (faster)
  const {
    data: order,
    isLoading,
    isError,
  } = trpc.opl.order.getOrderById.useQuery({
    id: orderId,
  })
  const canEditAfterCompletion = useMemo(() => {
    if (!order?.completedAt) return false
    const diff = differenceInMinutes(new Date(), new Date(order.completedAt))
    return diff <= 15
  }, [order?.completedAt])

  useEffect(() => {
    if (autoOpen) {
      setShowCompleteModal(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpen, onAutoOpenHandled])

  if (isLoading)
    return (
      <div className="w-full flex justify-center py-6">
        <LoaderSpinner />
      </div>
    )

  if (isError || !order)
    return <p className="text-destructive">Błąd ładowania danych.</p>

  return (
    <div className="space-y-4 text-sm bg-card p-4 rounded-lg">
      {/* Transfer alert */}
      {pendingMessage && (
        <Alert variant="destructive" className="!pl-3">
          <AlertDescription>{pendingMessage}</AlertDescription>
        </Alert>
      )}

      {/* Basic info */}
      <div className="space-y-1">
        <p>
          <strong>Adres:</strong> {order.city}, {order.street}
        </p>
        <p>
          <strong>Data:</strong> {new Date(order.date).toLocaleDateString()} •{' '}
          {order.timeSlot}
        </p>
        <p>
          <strong>Operator sieci:</strong>{' '}
          {order.network ? (oplNetworkMap[order.network] ?? order.network) : '-'}
        </p>
        {order.notes && (
          <p className="italic text-muted-foreground">„{order.notes}”</p>
        )}
      </div>

      {/* Incoming transfer actions */}
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

      {/* Technician actions */}
      {!disableTransfer && !incomingTransfer && (
        <>
          {orderStatus === OplOrderStatus.ASSIGNED ? (
            <div className="flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowCompleteModal(true)}
              >
                <BsSendCheck className="mr-1" />
                Odpisz
              </Button>
              <Button variant="default" onClick={() => setShowTransfer(true)}>
                <CgArrowsExchange className="mr-1" />
                Przekaż
              </Button>
            </div>
          ) : (
            (isAdmin || isCoordinator || canEditAfterCompletion) && (
              <div className="flex gap-2">
                <Button
                  variant="success"
                  onClick={() => setShowCompleteModal(true)}
                >
                  <MdEdit className="mr-1" />
                  Edytuj odpis
                </Button>
              </div>
            )
          )}
        </>
      )}

      {/* Transfer modal */}
      {/* <TransferOrderModal
        open={showTransfer}
        orderId={orderId}
        onClose={() => setShowTransfer(false)}
      /> */}

      {/* Complete wizard modal */}
      {/* <CompleteOrderWizard
        key={order.id}
        open={showCompleteModal}
        order={order}
        orderType={order.type}
        onCloseAction={async () => {
          setShowCompleteModal(false)
          await utils.opl.order.getTechnicianActiveOrders.invalidate()
          await utils.opl.order.getOrderById.invalidate({ id: orderId })
        }}
        // no heavy props here – just basic order completion
        materialDefs={[]}
        techMaterials={[]}
        devices={[]}
        workCodeDefs={[]}
        mode={canEditAfterCompletion ? 'amend' : 'complete'}
      /> */}
    </div>
  )
}

export default TechnicianOplPlanerOrderDetails
