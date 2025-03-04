'use client'

import { OrdersSearchProvider } from '@/app/context/OrdersSearchContext'
import OrdersTabs from './OrdersTabs'
import OrdersToolbar from './OrdersToolbar'

/**
 * OrdersContainer component:
 * - Holds toolbar and tabs for orders section.
 * - Wraps content in OrdersSearchProvider for search functionality.
 */
const OrdersContainer = () => {
  return (
    <OrdersSearchProvider>
      <div className="space-y-6">
        <OrdersToolbar />
        <OrdersTabs />
      </div>
    </OrdersSearchProvider>
  )
}

export default OrdersContainer
