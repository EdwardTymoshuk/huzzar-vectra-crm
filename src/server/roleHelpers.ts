// src/server/roleHelper.ts

import type { Role } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { t } from './trpc'

/* ---------- Middleware factory for role validation ---------- */
export const requireRole = (...allowed: Role[]) =>
  t.middleware(({ ctx, next }) => {
    const role = ctx.user?.role
    if (!role || !allowed.includes(role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden' })
    }
    return next()
  })

/* ---------- Handy role presets ---------- */

// 👑 Full access for admin only
export const adminOnly = t.procedure.use(requireRole('ADMIN'))

// 🔧 Admin + Coordinator
export const adminOrCoord = t.procedure.use(requireRole('ADMIN', 'COORDINATOR'))

// 📦 Admin + Warehouseman
export const adminOrWarehouse = t.procedure.use(
  requireRole('ADMIN', 'WAREHOUSEMAN')
)

// 🔧 Admin + Coordinator + Warehouseman
export const adminCoordOrWarehouse = t.procedure.use(
  requireRole('ADMIN', 'COORDINATOR', 'WAREHOUSEMAN')
)

// 🧑‍🔧 Technician only
export const technicianOnly = t.procedure.use(requireRole('TECHNICIAN'))

// ✅ All authenticated roles (including read-only users)
export const loggedInEveryone = t.procedure.use(
  requireRole('ADMIN', 'COORDINATOR', 'TECHNICIAN', 'WAREHOUSEMAN')
)
