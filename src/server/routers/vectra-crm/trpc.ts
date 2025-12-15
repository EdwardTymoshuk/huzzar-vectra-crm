// src/server/routers/vectra/trpc.ts
import { t } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import {
  getCoreUserOrThrow,
  getVectraUserOrThrow,
} from '../_helpers/getUserOrThrow'

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
