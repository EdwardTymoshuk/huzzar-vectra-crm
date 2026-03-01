//scr/app/(modules)/vectra-crm/layout.tsx

import LoaderLogo from '@/app/components/LoaderLogo'
import { authOptions } from '@/lib/authOptions'
import { getServerSession } from 'next-auth'
import { Suspense } from 'react'
import VectraClientRoutingHandlerTechnician from './components/VectraClientRoutingHandlerTechnician'

/**
 * Vectra CRM layout
 * --------------------------------------------------------------
 * Acts as a shell for both ADMIN and TECHNICIAN views.
 * Technician UI is rendered using tab-based routing.
 */
export default async function VectraCrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  return (
    <Suspense fallback={<LoaderLogo show />}>
      {role === 'TECHNICIAN' ? (
        <VectraClientRoutingHandlerTechnician>
          {children}
        </VectraClientRoutingHandlerTechnician>
      ) : (
        children
      )}
    </Suspense>
  )
}
