'use client'

import Header from '@/app/components/Header'
import MainContainer from '@/app/components/MainContainer'
import Sidebar from '@/app/components/Sidebar'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'

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

/**
 * ClientRoutingHandler:
 * - Dynamically renders the page based on `tab` query param.
 * - If on subroute like `/warehouse/details/[name]`, it renders `children` instead.
 */
const ClientRoutingHandler: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const isSubPage = pathname.includes('/warehouse/details/')

  const ActivePage = pages[activeTab] || pages.dashboard

  return (
    <>
      <Header />
      <div className="flex h-screen">
        <Sidebar />
        <MainContainer>{isSubPage ? children : <ActivePage />}</MainContainer>
      </div>
    </>
  )
}

export default ClientRoutingHandler
