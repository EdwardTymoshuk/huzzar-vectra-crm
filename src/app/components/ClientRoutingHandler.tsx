'use client'

import Header from '@/app/components/Header'
import MainContainer from '@/app/components/MainContainer'
import Sidebar from '@/app/components/Sidebar'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

/**
 * Lazy-load pages dynamically based on active tab
 */
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(() => import('@/app/admin-panel/page')),
  orders: dynamic(() => import('@/app/admin-panel/orders/page')),
  warehouse: dynamic(() => import('@/app/admin-panel/warehouse/page')),
  billing: dynamic(() => import('@/app/admin-panel/billing/page')),
  employees: dynamic(() => import('@/app/admin-panel/employees/page')),
  settings: dynamic(() => import('@/app/admin-panel/settings/page')),
  planning: dynamic(() => import('@/app/admin-panel/orders/planning/page')),
}

const ClientRoutingHandler: React.FC<{ children: React.ReactNode }> = ({}) => {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'

  // Select the corresponding page component, defaulting to dashboard
  const ActivePage = pages[activeTab] || pages.dashboard

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
        <div className="flex h-screen">
          <Sidebar />
          <MainContainer>
            <ActivePage />
          </MainContainer>
        </div>
      </Suspense>
    </>
  )
}
export default ClientRoutingHandler
