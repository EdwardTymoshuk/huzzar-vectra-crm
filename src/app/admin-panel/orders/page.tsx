// arc/app/admin-panel/orders/page.tsx

'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { useState } from 'react'
import OrdersTabs from '../components/orders/OrdersTabs'
import OrdersToolbar from '../components/orders/OrdersToolbar'

/**
 * OrdersPage component:
 * - Main page for displaying all orders content
 */
const OrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  return (
    <MaxWidthWrapper>
      <PageHeader title="Zlecenia" />
      <div className="space-y-6">
        <OrdersToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <OrdersTabs searchTerm={searchTerm} />
      </div>
    </MaxWidthWrapper>
  )
}

export default OrdersPage
