'use client'

import { MenuItem } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { usePathname, useRouter } from 'next/navigation'
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
  const pathname = usePathname()
  const router = useRouter()
  const { isWarehouseman, isTechnician } = useRole()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const menuItems = isTechnician ? technicianMenu : adminMenu

  const activeKey = useMemo(() => {
    const match = menuItems.find((item) =>
      pathname.startsWith(`${basePath}${item.href}`)
    )
    return match?.key ?? 'dashboard'
  }, [pathname, menuItems, basePath])

  const sharedProps = {
    menuItems,
    activeKey,
    router,
    isTechnician,
    isWarehouseman,
    basePath,
    moduleLabel,
  }

  return isMobile ? <MobileNav {...sharedProps} /> : <TopNav {...sharedProps} />
}

export default ResponsiveNavigation
