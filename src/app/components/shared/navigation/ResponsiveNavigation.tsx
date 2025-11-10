'use client'

import { adminsMenuItems, techniciansMenuItems } from '@/lib/constants'
import { MenuItem } from '@/types'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import MobileNav from './MobileNav'
import TopNav from './TopNav'

/**
 * ResponsiveNavigation
 *
 * - Desktop: top navigation bar with logo, menu, and user actions.
 * - Mobile: bottom tab navigation (native app style).
 */
const ResponsiveNavigation = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine menu items and context
  const isTechnician = session?.user?.role === 'TECHNICIAN'
  const menuItems: MenuItem[] = isTechnician
    ? techniciansMenuItems
    : adminsMenuItems

  // Compute active tab (always before conditional return)
  const activeKey = useMemo(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) return tabParam

    // Recognize "settings" page manually since it's not in menuItems
    if (pathname.includes('/settings')) return 'settings'

    const match = menuItems.find((item) => pathname.includes(item.key))
    return match ? match.key : 'dashboard'
  }, [pathname, searchParams, menuItems])

  if (!session?.user) return null

  return isMobile ? (
    <MobileNav
      menuItems={menuItems}
      activeKey={activeKey}
      router={router}
      isTechnician={!!isTechnician}
    />
  ) : (
    <TopNav
      menuItems={menuItems}
      activeKey={activeKey}
      router={router}
      isTechnician={!!isTechnician}
    />
  )
}

export default ResponsiveNavigation
