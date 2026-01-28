import { MODULE_CODES } from '@/lib/constants'
import { t } from '@/server/trpc'
import { TRPCError } from '@trpc/server'

/**
 * Middleware that validates access to OPL module.
 * ADMIN bypasses module assignment checks.
 */
export const requireOplModule = t.middleware(({ ctx, next }) => {
  const user = ctx.user

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (user.role !== 'ADMIN') {
    const hasOpl = user.modules?.some((m) => m.code === MODULE_CODES.OPL)

    if (!hasOpl) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No access to OPL module',
      })
    }
  }

  return next()
})
