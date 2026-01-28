import { Role, UserStatus } from '@prisma/client'

export type NormalizedUser = {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: Role
  status: UserStatus
  identyficator: number | null

  locations: {
    id: string
    name: string
  }[]

  modules: {
    id: string
    name: string
    code: string
  }[]
}

type FlatLocation = {
  id: string
  name: string
}

type JoinedLocation = {
  location: {
    id: string
    name: string
  }
}

type UserSource = {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: Role
  status: UserStatus
  identyficator: number | null

  locations: FlatLocation[] | JoinedLocation[]

  modules: {
    module: {
      id: string
      name: string
      code: string
    }
  }[]
}

/**
 * Type guard for joined (through-table) locations.
 */
function isJoinedLocation(
  location: FlatLocation | JoinedLocation
): location is JoinedLocation {
  return 'location' in location
}

/**
 * normalizeUser
 * --------------------------------------------------
 * Canonical normalization of Prisma user output.
 * No `any`, no assumptions, no leaking DB structure.
 */
export function normalizeUser(source: UserSource): NormalizedUser {
  const locations = source.locations.map((loc) =>
    isJoinedLocation(loc) ? loc.location : loc
  )

  const modules = source.modules.map((m) => m.module)

  return {
    id: source.id,
    name: source.name,
    email: source.email,
    phoneNumber: source.phoneNumber,
    role: source.role,
    status: source.status,
    identyficator: source.identyficator,
    locations,
    modules,
  }
}
