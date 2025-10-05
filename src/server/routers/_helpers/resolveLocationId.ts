import { UserWithLocations } from '@/types'
import { TRPCError } from '@trpc/server'

/**
 * resolveLocationId()
 * ------------------------------------------------------------------------
 * Resolves effective warehouse location for current user and request.
 * - ADMIN / COORDINATOR → must specify locationId explicitly or have at least one fallback
 * - WAREHOUSEMAN → uses given locationId or first assigned one
 * - TECHNICIAN → forbidden (they use technicianStock endpoints)
 *
 * @param user Current logged-in user (with locations)
 * @param input Optional object containing locationId
 * @returns Resolved valid locationId string
 */
export function resolveLocationId(
  user: UserWithLocations,
  input?: { locationId?: string }
): string {
  // Admins and coordinators must specify location, fallback to first assigned
  if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
    if (input?.locationId) return input.locationId
    const fallback = user.locations?.[0]?.id
    if (!fallback) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'LocationId is required for admins and coordinators',
      })
    }
    return fallback
  }

  // Warehouseman: use explicit location or first assigned
  if (user.role === 'WAREHOUSEMAN') {
    if (!user.locations || user.locations.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Warehouseman has no location assigned',
      })
    }
    return input?.locationId ?? user.locations[0].id
  }

  // Technicians cannot access warehouse location-based operations
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Technicians are not allowed to perform this operation',
  })
}
