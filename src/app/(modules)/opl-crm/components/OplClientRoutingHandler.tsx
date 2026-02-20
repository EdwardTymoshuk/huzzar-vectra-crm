'use client'

import LayoutShell from '@/app/components/LayoutShell'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import ResponsiveNavigation from '@/app/components/navigation/ResponsiveNavigation'
import { adminMenu, platformModules, technicianMenu } from '@/lib/constants'
import { useRole } from '@/utils/hooks/useRole'
import dynamic from 'next/dynamic'
import { redirect, usePathname, useSearchParams } from 'next/navigation'

const module = platformModules.find((m) => m.code === 'OPL')!

// Admin pages – OPL
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/dashboard/page')
  ),
  planning: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/planning/page')
  ),
  orders: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/orders/page')
  ),
  warehouse: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/warehouse/page')
  ),
  billing: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/billing/page')
  ),
  employees: dynamic(
    () => import('@/app/(modules)/opl-crm/admin-panel/employees/page')
  ),
}

const OplClientRoutingHandler = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isWarehouseman, isTechnician, isLoading } = useRole()

  if (isLoading) {
    return (
      <div className="w-full h-screen">
        <LoaderSpinner />
      </div>
    )
  }

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

  if (isTechnician) {
    redirect('/opl-crm?tab=dashboard')
  }

  if (isWarehouseman && !['orders', 'warehouse'].includes(activeTab)) {
    redirect('/opl-crm/admin-panel/warehouse')
  }

  const fallbackPage = isWarehouseman ? pages.warehouse : pages.dashboard
  const ActivePage = pages[activeTab] || fallbackPage

  return (
    <LayoutShell
      navigation={
        <ResponsiveNavigation
          basePath={module.href}
          moduleLabel={module.name}
          adminMenu={adminMenu}
          technicianMenu={technicianMenu}
        />
      }
    >
      {isSubPage ? children : <ActivePage key={activeTab} />}
    </LayoutShell>
  )
}

export default OplClientRoutingHandler
