// src/app/admin-panel/layout.tsx
'use client'

import { Suspense } from 'react'
import ClientRoutingHandler from '../components/ClientRoutingHandler'
import LoaderLogo from '../components/shared/LoaderLogo'

/**
 * Admin panel layout:
 * - Client wrapper for the "/admin-panel" segment.
 * - Renders sidebar/header via ClientRoutingHandler.
 */
const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LoaderLogo show />}>
      <ClientRoutingHandler>{children}</ClientRoutingHandler>
    </Suspense>
  )
}

export default AdminLayout
