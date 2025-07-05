// server/routers/user/misc.ts
import { loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'

export const miscUserRouter = router({
  /** Other technicians (for transfer) */
  getOtherTechnicians: loggedInEveryone
    .input(z.object({ excludeId: z.string().optional() }))
    .query(({ ctx, input }) =>
      prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          id: { not: input.excludeId ?? ctx.user!.id },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          status: true,
        },
      })
    ),
  /** List of technicians */
  getTechnicians: loggedInEveryone.query(() =>
    prisma.user.findMany({
      where: { role: 'TECHNICIAN', status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        status: true,
        identyficator: true,
        role: true,
      },
    })
  ),
})
