'use client'

import { useRole } from '@/utils/roleHelpers/useRole'
import dynamic from 'next/dynamic'
import { redirect, usePathname, useSearchParams } from 'next/navigation'
import LayoutShell from './shared/LayoutShell'
import LoaderSpinner from './shared/LoaderSpinner'

// Technician pages
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(() => import('@/app/(technician)/dashboard/page')),
  orders: dynamic(() => import('@/app/(technician)/orders/page')),
  warehouse: dynamic(() => import('@/app/(technician)/warehouse/page')),
  billing: dynamic(() => import('@/app/(technician)/billing/page')),
  settings: dynamic(() => import('@/app/(technician)/settings/page')),
}

const ClientRoutingHandlerTechnician = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { isWarehouseman, isLoading } = useRole()
  if (isLoading)
    return (
      <div className="w-full h-screen">
        <LoaderSpinner />
      </div>
    )

  if (isWarehouseman) {
    redirect('/admin-panel?tab=warehouse')
  }

  const getActiveKeyFromPathname = (pathname: string): string => {
    if (pathname.includes('/warehouse')) return 'warehouse'
    if (pathname.includes('/orders')) return 'orders'
    if (pathname.includes('/billing')) return 'billing'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const activeTab =
    searchParams.get('tab') || getActiveKeyFromPathname(pathname)

  const isSubPage = [
    '/orders/details/',
    '/warehouse/details/',
    '/warehouse/history',
    '/billing',
  ].some((sub) => pathname.includes(sub))

  const ActivePage = pages[activeTab] || pages.dashboard

  return (
    <LayoutShell>
      {isSubPage ? children : <ActivePage key={activeTab} />}
    </LayoutShell>
  )
}

export default ClientRoutingHandlerTechnician
