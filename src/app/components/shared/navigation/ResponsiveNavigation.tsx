'use client'

import { adminsMenuItems, techniciansMenuItems } from '@/lib/constants'
import { MenuItem } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import MobileNav from './MobileNav'
import TopNav from './TopNav'

/** Responsive navigation for admin/technician/warehouseman roles */
const ResponsiveNavigation = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  /** Detect viewport width */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { isWarehouseman, isTechnician } = useRole()

  /** Build menu list based on role */
  let menuItems: MenuItem[] = adminsMenuItems

  if (isTechnician) {
    menuItems = techniciansMenuItems
  }

  if (isWarehouseman) {
    /** Warehouseman sees only warehouse and orders */
    menuItems = adminsMenuItems.filter((item) =>
      ['warehouse', 'orders'].includes(item.key)
    )
  }

  /** Compute active tab */
  const activeKey = useMemo(() => {
    if (isWarehouseman) {
      const tab = searchParams.get('tab')
      return tab ?? 'warehouse'
    }

    const tabParam = searchParams.get('tab')
    if (tabParam) return tabParam

    if (pathname.includes('/settings')) return 'settings'

    const match = menuItems.find((item) => pathname.includes(item.key))
    return match ? match.key : 'dashboard'
  }, [pathname, searchParams, menuItems, isWarehouseman])

  /** Redirect warehouseman to warehouse by default */
  useEffect(() => {
    if (isWarehouseman && !searchParams.get('tab')) {
      router.replace('/admin-panel?tab=warehouse')
    }
  }, [isWarehouseman, searchParams, router])

  return isMobile ? (
    <MobileNav
      menuItems={menuItems}
      activeKey={activeKey}
      router={router}
      isTechnician={isTechnician}
      isWarehouseman={isWarehouseman}
    />
  ) : (
    <TopNav
      menuItems={menuItems}
      activeKey={activeKey}
      router={router}
      isTechnician={isTechnician}
      isWarehouseman={isWarehouseman}
    />
  )
}

export default ResponsiveNavigation
