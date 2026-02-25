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
  forcedRoleMode?: 'technician' | 'default'
}

const ResponsiveNavigation = ({
  basePath,
  moduleLabel,
  adminMenu,
  technicianMenu,
  forcedRoleMode = 'default',
}: Props) => {
  const [isMobile, setIsMobile] = useState(false)

  const pathname = usePathname()
  const router = useRouter()
  const { isWarehouseman, isTechnician } = useRole()
  const searchParams = useSearchParams()

  const effectiveIsTechnician =
    forcedRoleMode === 'technician' ? true : isTechnician
  const effectiveIsWarehouseman =
    forcedRoleMode === 'technician' ? false : isWarehouseman

  const menuItems = effectiveIsTechnician ? technicianMenu : adminMenu

  const normalizeTabKey = (tab: string | null) => {
    if (!tab) return tab
    if (effectiveIsTechnician && (tab === 'planning' || tab === 'planner')) {
      return 'planer'
    }
    return tab
  }

  const activeKey = useMemo(() => {
    const tab = normalizeTabKey(searchParams.get('tab'))

    /** Warehouseman always works in tab-based navigation */
    if (effectiveIsWarehouseman) {
      return tab ?? 'warehouse'
    }

    /** Tab param has priority */
    if (tab) return tab

    /** Fallbacks for route-based pages */
    if (pathname.includes('/settings')) return 'settings'

    const match = menuItems.find((item) => pathname.includes(item.key))

    return match?.key ?? 'dashboard'
  }, [
    pathname,
    searchParams,
    menuItems,
    effectiveIsWarehouseman,
    effectiveIsTechnician,
  ])

  const sharedProps = {
    menuItems,
    activeKey,
    router,
    isTechnician: effectiveIsTechnician,
    isWarehouseman: effectiveIsWarehouseman,
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
    if (effectiveIsWarehouseman && !searchParams.get('tab')) {
      router.replace(`${basePath}/admin-panel?tab=warehouse`)
    }
  }, [effectiveIsWarehouseman, searchParams, router, basePath])

  return isMobile ? <MobileNav {...sharedProps} /> : <TopNav {...sharedProps} />
}

export default ResponsiveNavigation
