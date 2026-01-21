// src/server/modules/opl-crm/routers/trpc.ts
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { t } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { getOplUserOrThrow } from '../services/oplUserAccess'

/**
 * Opl procedure
 * -------------------------------------------------------
 * - Ensures the user is authenticated (core user)
 * - Ensures the user has a OplUser entry
 * - Injects oplUser into context for all Opl routers
 */
export const oplProcedure = t.procedure.use(async ({ ctx, next }) => {
  const coreUser = getCoreUserOrThrow(ctx)

  // Load opl user from DB
  const oplUser = await getOplUserOrThrow(prisma, coreUser.id)

  // Extend context for the next resolvers
  return next({
    ctx: {
      ...ctx,
      oplUser,
    },
  })
})

/**
 * Opl router factory — equivalent of t.router but scoped to opl module.
 */
export const oplRouter = t.router
