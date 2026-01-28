// src/server/modules/opl-crm/services/resolveLocationId.ts

import { OplUserWithLocations } from '@/types/opl-crm'
import { TRPCError } from '@trpc/server'

export const resolveLocationId = (
  oplUser: OplUserWithLocations,
  locationId?: string
): string => {
  const { role, locations } = oplUser.user

  const resolvedLocations = locations.map((ul) => ul.location)

  if (role === 'ADMIN' || role === 'COORDINATOR') {
    if (locationId) return locationId

    const fallback = resolvedLocations[0]?.id
    if (!fallback) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'LocationId is required for admins and coordinators',
      })
    }

    return fallback
  }

  if (role === 'WAREHOUSEMAN') {
    if (resolvedLocations.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Warehouseman has no location assigned',
      })
    }

    return locationId ?? resolvedLocations[0].id
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Technicians are not allowed to perform this operation',
  })
}
