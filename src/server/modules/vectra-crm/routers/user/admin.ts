//src/server/modules/vectra-crm/routers/user/admin.ts
import { adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { mapVectraAdminToVM } from '../../helpers/mappers/mapVectraAdminToVM'
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
    return users.map(mapVectraAdminToVM)
  }),
  /** Single user details */
  getUserById: adminOnly
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
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

  /** Toggle active / suspended */
  toggleUserStatus: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.id } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
      return prisma.user.update({
        where: { id: input.id },
        data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      })
    }),

  /** Archive (INACTIVE) / Restore (ACTIVE) */
  archiveUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      prisma.user.update({
        where: { id: input.id },
        data: { status: 'INACTIVE' },
      })
    ),

  restoreUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      prisma.user.update({
        where: { id: input.id },
        data: { status: 'ACTIVE' },
      })
    ),

  /** Delete user */
  deleteUser: adminOnly
    .input(
      z.object({
        id: z.string(),
        force: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.force) {
        await prisma.user.delete({ where: { id: input.id } })
        return { ok: true }
      }

      const anonEmail = `deleted-${input.id}@example.invalid`
      await prisma.user.update({
        where: { id: input.id },
        data: {
          name: 'Usunięty użytkownik',
          email: anonEmail,
          phoneNumber: '',
          password: '',
          status: 'DELETED',
          deletedAt: new Date(),
        },
      })
      return { ok: true }
    }),
})
