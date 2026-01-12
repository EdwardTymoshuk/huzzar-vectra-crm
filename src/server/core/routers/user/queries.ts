//scr/server/core/routers/user/queries.ts

import { adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'

export const queriesCoreRouter = router({
  /**
   * Returns all enabled modules for assignment.
   */
  getModules: adminOnly.query(({ ctx }) => {
    return ctx.prisma.module.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        enabled: true,
      },
    })
  }),
  getLocations: adminOnly.query(({ ctx }) => {
    return ctx.prisma.userLocation.findMany({
      orderBy: { name: 'asc' },
    })
  }),
})
