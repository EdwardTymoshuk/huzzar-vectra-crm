// src/app/(modules)/opl-crm/admin-panel/layout.tsx
'use client'

import LoaderLogo from '@/app/components/LoaderLogo'
import { Suspense } from 'react'
import OplClientRoutingHandler from '../components/OplClientRoutingHandler'

/**
 * Admin panel layout:
 * - Client wrapper for the "/admin-panel" segment.
 * - Renders sidebar/header via ClientRoutingHandler.
 */
const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LoaderLogo show />}>
      <OplClientRoutingHandler>{children}</OplClientRoutingHandler>
    </Suspense>
  )
}

export default AdminLayout
