import { Role, UserStatus } from '@prisma/client'

type AdminRole = 'ADMIN' | 'COORDINATOR' | 'WAREHOUSEMAN'

/**
 * Exact shape returned by Prisma VectraUser query for admins
 */
export interface VectraAdminSource {
  userId: string
  user: {
    id: string
    name: string
    email: string
    phoneNumber: string
    role: Role
    status: UserStatus
    locations: {
      id: string
      name: string
    }[]
  }
}

export interface AdminUserVM {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: AdminRole
  status: UserStatus
  locationIds: string[]
  locations: {
    id: string
    name: string
  }[]
}

export const mapVectraAdminToVM = (
  vectraUser: VectraAdminSource
): AdminUserVM => {
  const { user } = vectraUser
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role as AdminRole,
    status: user.status,
    locationIds: user.locations.map((l) => l.id),
    locations: user.locations,
  }
}
