// src/utils/hooks/useActiveLocation.ts
'use client'

import { useRole } from '@/utils/hooks/useRole'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Reads currently active warehouse location from URL or user context.
 * Never performs routing decisions.
 */
export const useActiveLocation = (): string | null => {
  const { isAdmin, isCoordinator, isWarehouseman } = useRole()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // OPL works in single global warehouse location mode.
  if (pathname.startsWith('/opl-crm')) {
    if (isAdmin || isCoordinator || isWarehouseman) {
      return session?.user?.locations?.[0]?.id ?? null
    }
    return null
  }

  if (isAdmin || isCoordinator) {
    const loc = searchParams.get('loc')
    return loc && loc.length > 0 ? loc : null
  }

  if (isWarehouseman) {
    return session?.user?.locations?.[0]?.id ?? null
  }

  return null
}
