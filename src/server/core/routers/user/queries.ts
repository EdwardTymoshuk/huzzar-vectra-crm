//scr/server/core/routers/user/queries.ts

import { loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'

export const queriesCoreRouter = router({
  /**
   * Returns modules visible for current user.
   * - ADMIN: all enabled modules (for HR management screens)
   * - Other roles: only user's assigned enabled modules (for home module picker)
   */
  getModules: loggedInEveryone.query(async ({ ctx }) => {
    if (ctx.user?.role === 'ADMIN') {
      return ctx.prisma.module.findMany({
        where: { enabled: true },
        orderBy: { name: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          enabled: true,
        },
      })
    }

    return ctx.prisma.userModule.findMany({
      where: {
        userId: ctx.user!.id,
        module: {
          enabled: true,
        },
      },
      orderBy: {
        module: {
          name: 'desc',
        },
      },
      select: {
        module: {
          select: {
            id: true,
            name: true,
            code: true,
            enabled: true,
          },
        },
      },
    }).then((rows) => rows.map((row) => row.module))
  }),
})
