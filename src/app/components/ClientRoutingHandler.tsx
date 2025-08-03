'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import LayoutShell from './shared/LayoutShell'

// Admin pages
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(() => import('@/app/admin-panel/dashboard/page')),
  orders: dynamic(() => import('@/app/admin-panel/orders/page')),
  warehouse: dynamic(() => import('@/app/admin-panel/warehouse/page')),
  billing: dynamic(() => import('@/app/admin-panel/billing/page')),
  employees: dynamic(() => import('@/app/admin-panel/employees/page')),
  settings: dynamic(() => import('@/app/admin-panel/settings/page')),
  planning: dynamic(() => import('@/app/admin-panel/orders/planning/page')),
}

const ClientRoutingHandler = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getActiveKeyFromPathname = (pathname: string): string => {
    if (pathname.includes('/warehouse')) return 'warehouse'
    if (pathname.includes('/orders')) return 'orders'
    if (pathname.includes('/employees')) return 'employees'
    if (pathname.includes('/billing')) return 'billing'
    if (pathname.includes('/settings')) return 'settings'
    if (pathname.includes('/planning')) return 'planning'
    return 'dashboard'
  }

  const activeTab =
    searchParams.get('tab') || getActiveKeyFromPathname(pathname)

  const isSubPage = [
    '/warehouse/details/',
    '/warehouse/history',
    '/billing/technician/',
  ].some((sub) => pathname.includes(sub))

  const ActivePage = pages[activeTab] || pages.dashboard

  return <LayoutShell>{isSubPage ? children : <ActivePage />}</LayoutShell>
}

export default ClientRoutingHandler
