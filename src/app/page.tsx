// src/app/page.tsx
'use client'

import { useRole } from '@/utils/hooks/useRole'
import { useRouter } from 'next/navigation'
import ClientRoutingHandlerTechnician from './components/ClientRoutingHandlerTechnician'
import LoaderLogo from './components/shared/LoaderLogo'

/**
 * Home ("/"):
 * - If TECHNICIAN → render technician client routing handler (tabs via ?tab=...).
 * - If not logged → redirect to /login.
 * - If non-technician (ADMIN/COORD/WAREHOUSEMAN) → redirect to admin panel.
 */
export default function HomePage() {
  const { role, isLoading } = useRole()
  const router = useRouter()

  if (isLoading) return <LoaderLogo show />

  if (!role) {
    // Not logged → go login
    router.replace('/login')
    return null
  }

  if (role === 'TECHNICIAN') {
    // Technician stays on "/", we render the tabbed handler directly.
    return (
      <ClientRoutingHandlerTechnician>{null}</ClientRoutingHandlerTechnician>
    )
  }

  // All non-technician roles go to the admin-panel entry
  router.replace('/admin-panel?tab=dashboard')
  return null
}
