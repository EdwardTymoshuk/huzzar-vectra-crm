'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import OrdersContainer from '../components/orders/OrdersContainer'

/**
 * OrdersPage component:
 * - Main page for displaying all orders content
 */
const OrdersPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Zlecenia" />
      <OrdersContainer />
    </MaxWidthWrapper>
  )
}

export default OrdersPage
