// arc/app/admin-panel/orders/page.tsx

'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import OrdersTabs from '../components/orders/OrdersTabs'
import OrdersToolbar from '../components/orders/OrdersToolbar'

/**
 * OrdersPage component:
 * - Main page for displaying all orders content
 */
const OrdersPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Zlecenia" />
      <div className="space-y-6">
        <OrdersToolbar />
        <OrdersTabs />
      </div>
    </MaxWidthWrapper>
  )
}

export default OrdersPage
