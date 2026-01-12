// src/app/(modules)/vectra-crm/admin-panel/layout.tsx
'use client'

import LayoutShell from '@/app/components/LayoutShell'
import LoaderLogo from '@/app/components/LoaderLogo'
import { Suspense } from 'react'

/**
 * Hr module layout
 */
const HrLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Suspense fallback={<LoaderLogo show />}>
        <LayoutShell>{children}</LayoutShell>
      </Suspense>
    </>
  )
}

export default HrLayout
