'use client'

import OrdersTabs from './OrdersTabs'
import OrdersToolbar from './OrdersToolbar'

/**
 * OrdersContainer component:
 * - Holds toolbar and tabs for orders section
 */
const OrdersContainer = () => {
  return (
    <div className="space-y-6">
      <OrdersToolbar />
      <OrdersTabs />
    </div>
  )
}

export default OrdersContainer
