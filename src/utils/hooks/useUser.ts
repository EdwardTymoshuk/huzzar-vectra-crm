// src/utils/hooks/useUser.ts
import { Location, UserModule } from '@/types'
import type { Role } from '@prisma/client'
import { useSession } from 'next-auth/react'

/**
 * useUser
 * --------------------------------------------------
 * Single source of truth for authenticated user data.
 * Contains NO permission logic.
 */
export function useUser() {
  const { data, status } = useSession()

  const user = data?.user as
    | {
        id: string
        role: Role
        modules: UserModule[]
        locations?: Location[]
      }
    | undefined

  return {
    user,
    role: user?.role,
    modules: user?.modules ?? [],
    locations: user?.locations ?? [],
    isLoading: status === 'loading',
    isLoggedIn: !!user,
  }
}
