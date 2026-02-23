'use client'

import { MenuItem } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import MobileNav from './MobileNav'
import TopNav from './TopNav'

interface Props {
  basePath: string
  moduleLabel: string
  adminMenu: MenuItem[]
  technicianMenu: MenuItem[]
}

const ResponsiveNavigation = ({
  basePath,
  moduleLabel,
  adminMenu,
  technicianMenu,
}: Props) => {
  const [isMobile, setIsMobile] = useState(false)

  const pathname = usePathname()
  const router = useRouter()
  const { isWarehouseman, isTechnician } = useRole()
  const searchParams = useSearchParams()

  const menuItems = isTechnician ? technicianMenu : adminMenu

  const normalizeTabKey = (tab: string | null) => {
    if (!tab) return tab
    if (isTechnician && (tab === 'planning' || tab === 'planner')) {
      return 'planer'
    }
    return tab
  }

  const activeKey = useMemo(() => {
    const tab = normalizeTabKey(searchParams.get('tab'))

    /** Warehouseman always works in tab-based navigation */
    if (isWarehouseman) {
      return tab ?? 'warehouse'
    }

    /** Tab param has priority */
    if (tab) return tab

    /** Fallbacks for route-based pages */
    if (pathname.includes('/settings')) return 'settings'

    const match = menuItems.find((item) => pathname.includes(item.key))

    return match?.key ?? 'dashboard'
  }, [pathname, searchParams, menuItems, isWarehouseman, isTechnician])

  const sharedProps = {
    menuItems,
    activeKey,
    router,
    isTechnician,
    isWarehouseman,
    basePath,
    moduleLabel,
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isWarehouseman && !searchParams.get('tab')) {
      router.replace(`${basePath}/admin-panel?tab=warehouse`)
    }
  }, [isWarehouseman, searchParams, router, basePath])

  return isMobile ? <MobileNav {...sharedProps} /> : <TopNav {...sharedProps} />
}

export default ResponsiveNavigation
