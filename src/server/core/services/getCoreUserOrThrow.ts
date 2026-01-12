// src/server/core/services/getCoreUserOrThrow.ts

import type { Context } from '@/types'
import { TRPCError } from '@trpc/server'

/**
 * Returns authenticated core (global) session user.
 * Throws UNAUTHORIZED if user is not logged in.
 */
export const getCoreUserOrThrow = (
  ctx: Pick<Context, 'user'>
): NonNullable<Context['user']> => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not logged in',
    })
  }

  return ctx.user
}
