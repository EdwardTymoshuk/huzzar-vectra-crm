//scr/app/(modules)/opl-crm/layout.tsx

import LoaderLogo from '@/app/components/LoaderLogo'
import { authOptions } from '@/lib/authOptions'
import { getServerSession } from 'next-auth'
import { Suspense } from 'react'
import ClientRoutingHandlerTechnician from './components/OplClientRoutingHandlerTechnician'

/**
 * Vectra CRM layout
 * --------------------------------------------------------------
 * Acts as a shell for both ADMIN and TECHNICIAN views.
 * Technician UI is rendered using tab-based routing.
 */
export default async function OplCrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  return (
    <Suspense fallback={<LoaderLogo show />}>
      {role === 'TECHNICIAN' ? (
        <ClientRoutingHandlerTechnician>{children}</ClientRoutingHandlerTechnician>
      ) : (
        children
      )}
    </Suspense>
  )
}
