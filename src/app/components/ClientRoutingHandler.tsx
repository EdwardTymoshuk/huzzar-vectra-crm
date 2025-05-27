'use client'

import Header from '@/app/components/Header'
import MainContainer from '@/app/components/MainContainer'
import Sidebar from '@/app/components/Sidebar'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import RouteProgress from './shared/RouteProgress'

// Lazy-load all tabbed routes
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
 * - Renders layout with Sidebar/Header.
 * - Uses query param `tab` to load the correct main page.
 * - For subroutes (e.g., warehouse details or history), renders `children`.
 */
const ClientRoutingHandler: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const getActiveKeyFromPathname = (pathname: string): string => {
    if (pathname.includes('/warehouse')) return 'warehouse'
    if (pathname.includes('/orders')) return 'orders'
    if (pathname.includes('/employees')) return 'employees'
    if (pathname.includes('/billing')) return 'billing'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const activeTab =
    searchParams.get('tab') || getActiveKeyFromPathname(pathname)

  // Subpages that shouldn't render via dynamic `tab` routing
  const isSubPage = [
    '/warehouse/details/',
    '/warehouse/history',
    '/billing/technician/',
  ].some((sub) => pathname.includes(sub))

  const ActivePage = pages[activeTab] || pages.dashboard

  return (
    <>
      <RouteProgress />
      <Header />
      <div className="flex md:h-screen md:overflow-hidden">
        <Sidebar />
        <MainContainer>{isSubPage ? children : <ActivePage />}</MainContainer>
      </div>
    </>
  )
}

export default ClientRoutingHandler
