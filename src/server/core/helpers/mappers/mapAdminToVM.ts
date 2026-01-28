//src/server/core/helpers/mappers/mapAdminToVM

import { Role, UserStatus } from '@prisma/client'

type AdminRole = 'ADMIN' | 'COORDINATOR' | 'WAREHOUSEMAN'

type LocationLite = {
  id: string
  name: string
}

type UserLocationWithLocation = {
  location: LocationLite
}

/**
 * Exact shape returned by Prisma VectraUser query for admins
 */
export interface AdminSource {
  userId: string
  user: {
    id: string
    name: string
    email: string
    phoneNumber: string
    role: Role
    status: UserStatus
    locations: UserLocationWithLocation[]
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
  locations: LocationLite[]
}

export const mapAdminToVM = (source: AdminSource): AdminUserVM => {
  const { user } = source
  const locations = user.locations.map((ul) => ul.location)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role as AdminRole,
    status: user.status,
    locationIds: locations.map((l) => l.id),
    locations,
  }
}
