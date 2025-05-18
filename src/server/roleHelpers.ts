import type { Role } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { t } from './trpc'

/**
 * Middleware factory that ensures the user has one of the specified roles.
 * Accepts a list of roles and checks against ctx.user.role.
 */
export const requireRole = (...allowed: Role[]) =>
  t.middleware(({ ctx, next }) => {
    const role = ctx.user?.role
    if (!role || !allowed.includes(role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden' })
    }
    return next()
  })

/** Procedure only accessible by users with the ADMIN role */
export const adminOnly = t.procedure.use(requireRole('ADMIN'))

/** Procedure accessible by users with either ADMIN or COORDINATOR role */
export const adminOrCoord = t.procedure.use(requireRole('ADMIN', 'COORDINATOR'))

/** Procedure accessible by any authenticated role */
export const loggedInEveryone = t.procedure.use(
  requireRole('ADMIN', 'COORDINATOR', 'TECHNICIAN', 'WAREHOUSEMAN', 'USER')
)
