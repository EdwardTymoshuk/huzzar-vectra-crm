'use client'

import CompleteOrderModal from '@/app/(technician)/components/orders/completeOrder/CompleteOrderModal'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { Button } from '@/app/components/ui/button'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoCheckmarkDone } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { toast } from 'sonner'

type Props = { order: { id: string } }

/**
 * Accordion details for OrdersTable rows:
 * - Displays read-only details.
 * - Allows "amend" modal for completed/not-completed orders, except warehouse role.
 */
const OrderAccordionDetails = ({ order }: Props) => {
  const utils = trpc.useUtils()
  const [openAmend, setOpenAmend] = useState(false)
  const { isWarehouseman, isAdmin, isCoordinator } = useRole()
  const session = useSession()

  const editOrder = trpc.order.editOrder.useMutation()

  // Fetch details for the row
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: order.id,
  })

  if (isLoading)
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )

  if (isError || !data)
    return (
      <div className="p-4 text-danger">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )

  const isConfirmed = data.notes?.toLowerCase().includes('zatwierdzone przez')

  const canAmend =
    data.status === OrderStatus.COMPLETED ||
    data.status === OrderStatus.NOT_COMPLETED

  const canApprove =
    (isAdmin || isCoordinator) &&
    (data.type === 'SERVICE' || data.type === 'OUTAGE') &&
    data.status === OrderStatus.COMPLETED &&
    !isConfirmed

  return (
    <div className="space-y-4">
      <OrderDetailsContent order={data} isConfirmed={isConfirmed} />

      {(canAmend || canApprove) && (
        <div className="flex gap-2 pt-2">
          {canAmend && !isWarehouseman && (
            <Button variant="warning" onClick={() => setOpenAmend(true)}>
              <MdEdit className="mr-1" />
              Edytuj odpis
            </Button>
          )}

          {canApprove && (
            <Button
              variant="success"
              onClick={async () => {
                const now = new Date()
                const dateFormatted = formatDateTime(now)
                const updatedNotes = `${
                  data.notes ? data.notes + '\n' : ''
                }Zatwierdzone przez ${
                  session.data?.user?.name
                } (${dateFormatted})`

                await editOrder.mutateAsync({
                  id: data.id,
                  notes: updatedNotes,
                  orderNumber: data.orderNumber,
                  date: data.date.toISOString().split('T')[0],
                  timeSlot: data.timeSlot,
                  status: data.status,
                  city: data.city,
                  street: data.street,
                  assignedToId: data.assignedTo?.id,
                })

                toast.success('Zlecenie zostało zatwierdzone.')
                await utils.order.getOrderById.invalidate({ id: data.id })
                await utils.order.getOrders.invalidate()
              }}
            >
              <IoCheckmarkDone className="mr-1" />
              Zatwierdź
            </Button>
          )}
        </div>
      )}

      <CompleteOrderModal
        open={openAmend}
        onCloseAction={async () => {
          setOpenAmend(false)
          await utils.order.getOrderById.invalidate({ id: order.id })
          await utils.order.getOrders.invalidate()
        }}
        order={data}
        orderType={data.type}
        mode="amend"
      />
    </div>
  )
}

export default OrderAccordionDetails
