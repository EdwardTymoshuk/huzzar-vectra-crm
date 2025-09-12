'use client'

import CompleteOrderModal from '@/app/(technician)/components/orders/completeOrder/CompleteOrderModal'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/roleHelpers/useRole'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useState } from 'react'
import { MdEdit } from 'react-icons/md'

type Props = { order: { id: string } }

/**
 * Accordion details for OrdersTable rows:
 * - Displays read-only details.
 * - Allows "amend" modal for completed/not-completed orders, except warehouse role.
 */
const OrderAccordionDetails = ({ order }: Props) => {
  const utils = trpc.useUtils()
  const [openAmend, setOpenAmend] = useState(false)

  // Fetch details for the row
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: order.id,
  })

  const { isWarehouseman } = useRole()

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

  const canAmend =
    data.status === OrderStatus.COMPLETED ||
    data.status === OrderStatus.NOT_COMPLETED

  return (
    <div className="space-y-4">
      <OrderDetailsContent order={data} />

      {canAmend && !isWarehouseman && (
        <div className="flex gap-2 pt-2">
          <Button variant="success" onClick={() => setOpenAmend(true)}>
            <MdEdit className="mr-1" />
            Edytuj / uzupełnij odpis
          </Button>
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
