import type { Role } from '@prisma/client'
import { useSession } from 'next-auth/react'

/**
 * Centralized role hook with loading state.
 * Add more flags if needed (isTechnician, isLoggedIn, etc).
 */
export const useRole = () => {
  const { data: session, status } = useSession()
  const role = session?.user?.role as Role | undefined

  return {
    role,
    isLoading: status === 'loading',
    isAdmin: role === 'ADMIN',
    isCoordinator: role === 'COORDINATOR',
    isWarehouseman: role === 'WAREHOUSEMAN',
    isTechnician: role === 'TECHNICIAN',
    isLoggedIn: !!role,
  }
}
