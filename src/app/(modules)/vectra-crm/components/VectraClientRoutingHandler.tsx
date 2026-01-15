'use client'

import LayoutShell from '@/app/components/LayoutShell'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import { useRole } from '@/utils/hooks/useRole'
import dynamic from 'next/dynamic'
import { redirect, usePathname, useSearchParams } from 'next/navigation'

// Admin pages
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/dashboard/page')
  ),
  planning: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/planning/page')
  ),
  orders: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/orders/page')
  ),
  warehouse: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/warehouse/page')
  ),
  billing: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/billing/page')
  ),
  employees: dynamic(
    () => import('@/app/(modules)/vectra-crm/admin-panel/employees/page')
  ),
}

const ClientRoutingHandler = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { isWarehouseman, isLoading: isPageLoading } = useRole()

  if (isPageLoading)
    return (
      <div className="w-full h-screen">
        <LoaderSpinner />
      </div>
    )

  const getActiveKeyFromPathname = (pathname: string): string => {
    if (pathname.includes('/warehouse')) return 'warehouse'
    if (pathname.includes('/planning')) return 'planning'
    if (pathname.includes('/orders')) return 'orders'
    if (pathname.includes('/employees')) return 'employees'
    if (pathname.includes('/billing')) return 'billing'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const rawTab = searchParams.get('tab') || getActiveKeyFromPathname(pathname)
  const activeTab =
    rawTab === 'dashboard' && isWarehouseman ? 'warehouse' : rawTab

  const isSubPage = [
    '/warehouse/details/',
    '/warehouse/history',
    '/billing/technician/',
  ].some((sub) => pathname.includes(sub))

  if (isWarehouseman && !['orders', 'warehouse'].includes(activeTab)) {
    redirect('/admin-panel/warehouse')
  }

  const fallbackPage = isWarehouseman ? pages.warehouse : pages.dashboard
  const ActivePage = pages[activeTab] || fallbackPage

  return <LayoutShell>{isSubPage ? children : <ActivePage />}</LayoutShell>
}

export default ClientRoutingHandler
