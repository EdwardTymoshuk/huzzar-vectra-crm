// server/routers/user/admin.ts
import { adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { sendNewAccountEmail } from '@/utils/mail/sendNewAccountEmail'
import { prisma } from '@/utils/prisma'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'

export const adminUserRouter = router({
  /** List of non-technician staff */
  getAdmins: adminOnly.query(() =>
    prisma.user.findMany({
      where: { role: { in: ['COORDINATOR', 'WAREHOUSEMAN', 'ADMIN'] } },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        role: true,
        status: true,
        locations: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })
  ),

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

  /** Create user */
  createUser: adminOnly
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        phoneNumber: z.string(),
        identyficator: z.number().optional(),
        role: z
          .enum(['TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN', 'ADMIN'])
          .default('TECHNICIAN'),
        locationIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const hash = await bcrypt.hash(input.password, 10)

      const newUser = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hash,
          phoneNumber: input.phoneNumber,
          identyficator: input.identyficator,
          role: input.role,
          status: 'ACTIVE',
          ...(input.locationIds
            ? {
                locations: {
                  connect: input.locationIds.map((id) => ({ id })),
                },
              }
            : {}),
        },
      })

      try {
        await sendNewAccountEmail({
          to: input.email,
          name: input.name,
          email: input.email,
          password: input.password,
        })
      } catch (error) {
        console.error('Błąd wysyłki e-maila powitalnego:', error)
      }

      return newUser
    }),

  /** Edit user */
  editUser: adminOnly
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phoneNumber: z.string(),
        password: z
          .string()
          .min(8)
          .max(32)
          .regex(/[a-z]/)
          .regex(/[A-Z]/)
          .regex(/\d/)
          .regex(/[!@#$%^&*()_+{}[\]<>?]/)
          .optional(),
        role: z
          .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
          .optional(),
        locationIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data: Prisma.UserUpdateInput = {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
      }
      if (input.password) data.password = await bcrypt.hash(input.password, 10)
      if (input.role) data.role = input.role
      if (input.locationIds) {
        data.locations = {
          set: input.locationIds.map((id) => ({ id })),
        }
      }
      return prisma.user.update({ where: { id: input.id }, data })
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
