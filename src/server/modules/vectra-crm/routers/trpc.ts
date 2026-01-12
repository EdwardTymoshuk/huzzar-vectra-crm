// src/server/modules/vectra-crm/routers/trpc.ts
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { t } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { getVectraUserOrThrow } from '../services/vectraUserAccess'

/**
 * Vectra procedure
 * -------------------------------------------------------
 * - Ensures the user is authenticated (core user)
 * - Ensures the user has a VectraUser entry
 * - Injects vectraUser into context for all Vectra routers
 */
export const vectraProcedure = t.procedure.use(async ({ ctx, next }) => {
  const coreUser = getCoreUserOrThrow(ctx)

  // Load vectra user from DB
  const vectraUser = await getVectraUserOrThrow(prisma, coreUser.id)

  // Extend context for the next resolvers
  return next({
    ctx: {
      ...ctx,
      vectraUser,
    },
  })
})

/**
 * Vectra router factory — equivalent of t.router but scoped to vectra module.
 */
export const vectraRouter = t.router
