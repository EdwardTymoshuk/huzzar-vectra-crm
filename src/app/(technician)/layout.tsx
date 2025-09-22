import Providers from '@/app/components/Providers'
import { Suspense } from 'react'
import ClientRoutingHandlerTechnician from '../components/ClientRoutingHandlerTechnician'
import LoaderLogo from '../components/shared/LoaderLogo'

/**
 * Technician layout:
 * - Wraps technician routes with Providers, Suspense and routing handler.
 * - Does NOT render <html>/<body> (these belong only to RootLayout).
 */
const TechnicianLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <Suspense fallback={<LoaderLogo show={true} />}>
        <ClientRoutingHandlerTechnician>
          {children}
        </ClientRoutingHandlerTechnician>
      </Suspense>
    </Providers>
  )
}

export default TechnicianLayout
