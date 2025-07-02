'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import LayoutShell from './shared/LayoutShell'

// Technician pages
const pages: Record<string, React.ComponentType> = {
  dashboard: dynamic(() => import('@/app/(technician)/dashboard/page')),
  orders: dynamic(() => import('@/app/(technician)/orders/page')),
  warehouse: dynamic(() => import('@/app/(technician)/warehouse/page')),
  settings: dynamic(() => import('@/app/(technician)/settings/page')),
}

const ClientRoutingHandlerTechnician = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getActiveKeyFromPathname = (pathname: string): string => {
    if (pathname.includes('/warehouse')) return 'warehouse'
    if (pathname.includes('/orders')) return 'orders'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const activeTab =
    searchParams.get('tab') || getActiveKeyFromPathname(pathname)

  const isSubPage = [
    '/orders/details/',
    '/warehouse/details/',
    '/warehouse/history',
  ].some((sub) => pathname.includes(sub))

  const ActivePage = pages[activeTab] || pages.dashboard

  return (
    <LayoutShell>
      {isSubPage ? children : <ActivePage key={activeTab} />}
    </LayoutShell>
  )
}

export default ClientRoutingHandlerTechnician
