'use client'

import LayoutShell from '@/app/components/LayoutShell'
import LoaderLogo from '@/app/components/LoaderLogo'
import ResponsiveNavigation from '@/app/components/navigation/ResponsiveNavigation'
import { hrAdminMenu, platformModules } from '@/lib/constants'
import { Suspense } from 'react'

const module = platformModules.find((m) => m.code === 'HR')!

/**
 * HR module layout
 * --------------------------------------------------
 * Uses shared application shell with HR-specific navigation.
 */
const HrLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LoaderLogo show />}>
      <LayoutShell
        navigation={
          <ResponsiveNavigation
            basePath={module.href}
            moduleLabel={module.name}
            adminMenu={hrAdminMenu}
            technicianMenu={[]}
          />
        }
      >
        {children}
      </LayoutShell>
    </Suspense>
  )
}

export default HrLayout
