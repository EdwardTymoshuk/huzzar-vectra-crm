'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { trpc } from '@/utils/trpc'

type Props = { order: { id: string } }

const OrderAccordionDetails = ({ order }: Props) => {
  // 📦 Fetch order details
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: order.id,
  })

  // 🔄 Loading state
  if (isLoading)
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )

  // ❌ Error or no data
  if (isError || !data)
    return (
      <div className="p-4 text-danger">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )

  // 🖼️ UI layout
  return <OrderDetailsContent order={data} />
}

export default OrderAccordionDetails
