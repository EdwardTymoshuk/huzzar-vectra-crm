import LoaderLogo from '@/app/components/LoaderLogo'
import Providers from '@/app/components/Providers'
import { authOptions } from '@/lib/authOptions'
import { getServerSession } from 'next-auth'
import { Suspense } from 'react'
import ClientRoutingHandlerTechnician from './components/VectraClientRoutingHandlerTechnician'

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
    <Providers>
      <Suspense fallback={<LoaderLogo show />}>
        {role === 'TECHNICIAN' ? (
          <ClientRoutingHandlerTechnician>
            {children}
          </ClientRoutingHandlerTechnician>
        ) : (
          children
        )}
      </Suspense>
    </Providers>
  )
}
