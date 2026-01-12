// src/server/modules/vectra-crm/services/resolveLocationId.ts

import { VectraUserWithLocations } from '@/types/vectra-crm'
import { TRPCError } from '@trpc/server'

export const resolveLocationId = (
  vectraUser: VectraUserWithLocations,
  locationId?: string
): string => {
  const { role, locations } = vectraUser.user

  if (role === 'ADMIN' || role === 'COORDINATOR') {
    if (locationId) return locationId

    const fallback = locations?.[0]?.id
    if (!fallback) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'LocationId is required for admins and coordinators',
      })
    }

    return fallback
  }

  if (role === 'WAREHOUSEMAN') {
    if (!locations || locations.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Warehouseman has no location assigned',
      })
    }

    return locationId ?? locations[0].id
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Technicians are not allowed to perform this operation',
  })
}
