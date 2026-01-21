// src/app/(modules)/vectra-crm/admin-panel/layout.tsx
'use client'

import LoaderLogo from '@/app/components/LoaderLogo'
import { Suspense } from 'react'
import VectraClientRoutingHandler from '../components/VectraClientRoutingHandler'

/**
 * Admin panel layout:
 * - Client wrapper for the "/admin-panel" segment.
 * - Renders sidebar/header via ClientRoutingHandler.
 */
const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LoaderLogo show />}>
      <VectraClientRoutingHandler>{children}</VectraClientRoutingHandler>
    </Suspense>
  )
}

export default AdminLayout
