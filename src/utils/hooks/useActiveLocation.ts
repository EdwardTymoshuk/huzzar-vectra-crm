// src/utils/useActiveLocation.ts
'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useRole } from './useRole'

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

  // Admin/Coordinator → wybór z query param
  if (isAdmin || isCoordinator) {
    const loc = searchParams.get('loc')
    return loc ?? null
  }

  // Warehouseman → pierwszy przypisany magazyn
  if (isWarehouseman) {
    return session?.user?.locations?.[0]?.id ?? null
  }

  return null
}
