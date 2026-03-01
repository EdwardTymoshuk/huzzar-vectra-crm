//scr/app/(modules)/vectra-crm/page.tsx

'use client'

import LoaderLogo from '@/app/components/LoaderLogo'
import { useRole } from '@/utils/hooks/useRole'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Vectra CRM entry page
 * --------------------------------------------------------------
 * Determines initial Vectra CRM route based on role.
 */
export default function VectraCrmEntryPage() {
  const router = useRouter()
  const { role, isLoading } = useRole()

  useEffect(() => {
    if (isLoading) return
    if (!role) return

    if (role === 'ADMIN' || role === 'COORDINATOR') {
      router.replace('/vectra-crm/admin-panel')
      return
    }

    if (role === 'WAREHOUSEMAN') {
      router.replace('/vectra-crm/admin-panel?tab=warehouse')
      return
    }

    if (role === 'TECHNICIAN') {
      router.replace('/vectra-crm?tab=dashboard')
      return
    }

    router.replace('/')
  }, [role, isLoading, router])

  return <LoaderLogo show />
}
