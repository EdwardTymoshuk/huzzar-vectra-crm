//src/server/modules/vectra-crm/routers/user/admin.ts
import { adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { mapAdminToVM } from '../../../../core/helpers/mappers/mapAdminToVM'
import { vectraAdminSelect } from '../../helpers/selects'

export const adminUserRouter = router({
  /** List of non-technician hr */
  getAdmins: adminOnly.query(async ({ ctx }) => {
    const users = await ctx.prisma.vectraUser.findMany({
      where: {
        user: {
          role: {
            in: ['ADMIN', 'COORDINATOR', 'WAREHOUSEMAN'],
          },
        },
      },
      select: vectraAdminSelect,
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })
    return users.map(mapAdminToVM)
  }),
  /** Single user details */
  getUserById: adminOnly
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          identyficator: true,
          locations: { select: { id: true, name: true } },
        },
      })
      if (!user)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Użytkownik nie istnieje.',
        })
      return user
    }),
})
