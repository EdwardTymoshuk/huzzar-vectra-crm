// src/utils/useActiveLocation.ts
'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useRole } from '../../../../../utils/hooks/useRole'

/**
 * useActiveLocation:
 * - Admin/Coordinator: location comes from query param (?loc=)
 * - Warehouseman: first assigned location (or null if none)
 * - Others: null
 */
export const useActiveLocation = () => {
  const { data: session } = useSession()
  const { isAdmin, isCoordinator, isWarehouseman } = useRole()
  const searchParams = useSearchParams()

  if (isAdmin || isCoordinator) {
    const loc = searchParams.get('loc')
    return loc ?? null
  }

  if (isWarehouseman) {
    return session?.user?.locations?.[0]?.id ?? null
  }

  return null
}
