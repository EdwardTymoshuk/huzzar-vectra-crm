//src/server/modules/hr/routers/user/index.ts

import { syncVectraUser } from '@/app/(modules)/vectra-crm/utils/users/syncVectraUser'
import { adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { sendNewAccountEmail } from '@/utils/mail/sendNewAccountEmail'
import { Prisma, Role, UserStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'

/**
 * Core hr management router.
 * Responsible for creating and managing system users.
 */
export const hrUserRouter = router({
  /**
   * Returns all active users with assigned modules.
   */
  getUsers: adminOnly.query(({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        modules: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        locations: true,
      },

      orderBy: { createdAt: 'desc' },
    })
  }),

  getUserById: adminOnly
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
          locations: true,
          modules: {
            include: {
              module: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      })
    ),

  /**
   * Creates a new system user and assigns modules.
   */
  createUser: adminOnly
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
        phoneNumber: z.string().min(6),
        password: z.string().min(8),
        role: z.nativeEnum(Role),
        moduleIds: z.array(z.string()).min(1),
        locationIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        })
      }

      const passwordHash = await bcrypt.hash(input.password, 10)

      const user = await ctx.prisma.$transaction(async (tx) => {
        const validLocations = await tx.userLocation.findMany({
          where: { id: { in: input.locationIds } },
          select: { id: true },
        })

        if (validLocations.length !== input.locationIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Wybrano nieprawidłowe lokalizacje.',
          })
        }

        const modules = await tx.module.findMany({
          where: { id: { in: input.moduleIds } },
          select: { code: true },
        })

        if (modules.length !== input.moduleIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Wybrano nieprawidłowe moduły.',
          })
        }

        const hasVectra = modules.some((m) => m.code === 'VECTRA')

        const createdUser = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            phoneNumber: input.phoneNumber,
            password: passwordHash,
            role: input.role,
            status: 'ACTIVE',
            modules: {
              create: input.moduleIds.map((moduleId) => ({
                moduleId,
              })),
            },
            locations: {
              connect: validLocations.map((l) => ({ id: l.id })),
            },
          },
        })
        /**
         * Synchronize Vectra domain user with assigned modules.
         * Creates or activates VectraUser if VECTRA module is assigned.
         */
        await syncVectraUser(tx, createdUser.id, hasVectra)

        return createdUser
      })

      /**
       * Sends welcome email with temporary password.
       * Email failure must not rollback user creation.
       */
      try {
        await sendNewAccountEmail({
          to: input.email,
          name: input.name,
          email: input.email,
          password: input.password,
        })
      } catch (error) {
        console.error('Failed to send welcome email:', error)
      }

      return user
    }),

  updateUser: adminOnly
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phoneNumber: z.string().min(6),
        identyficator: z.number().int().positive().optional(),
        role: z.nativeEnum(Role),
        status: z.nativeEnum(UserStatus),
        moduleIds: z.array(z.string()).min(1),
        locationIds: z.array(z.string()).optional(),
        password: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        /**
         * Ensure user exists.
         */
        const existingUser = await tx.user.findUnique({
          where: { id: input.userId },
          select: { id: true, email: true, identyficator: true },
        })

        if (!existingUser) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' })
        }

        /**
         * Prevent email duplication if changed.
         */
        if (input.email !== existingUser.email) {
          const emailTaken = await tx.user.findUnique({
            where: { email: input.email },
            select: { id: true },
          })

          if (emailTaken) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Użytkownik z tym adresem e-mail już istnieje.',
            })
          }
        }

        /**
         * Prevent identyficator duplication if provided and changed.
         */
        if (
          typeof input.identyficator === 'number' &&
          input.identyficator !== existingUser.identyficator
        ) {
          const identTaken = await tx.user.findUnique({
            where: { identyficator: input.identyficator },
            select: { id: true },
          })

          if (identTaken) {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Ten identyfikator jest już przypisany do innego użytkownika.',
            })
          }
        }

        /**
         * Resolve module codes from provided module IDs.
         * This is the ONLY correct way to check if user has access to a module.
         */
        const modules = await tx.module.findMany({
          where: { id: { in: input.moduleIds } },
          select: { id: true, code: true },
        })

        if (modules.length !== input.moduleIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Wybrano nieprawidłowe moduły.',
          })
        }

        const moduleCodes = modules.map((m) => m.code)
        const hasVectra = moduleCodes.includes('VECTRA')

        /**
         * Update core user fields.
         */
        const updateData: Prisma.UserUpdateInput = {
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          identyficator: input.identyficator ?? null,
          role: input.role,
          status: input.status,
        }

        /**
         * Hash and update password only if provided.
         */
        if (input.password) {
          updateData.password = await bcrypt.hash(input.password, 10)
        }

        await tx.user.update({
          where: { id: input.userId },
          data: updateData,
        })

        /**
         * Replace module assignments.
         */
        await tx.userModule.deleteMany({ where: { userId: input.userId } })
        await tx.userModule.createMany({
          data: modules.map((m) => ({
            userId: input.userId,
            moduleId: m.id,
          })),
        })

        /**
         * Replace locations assignment (optional).
         * If HR does not manage locations, you can remove this block entirely.
         */
        if (input.locationIds) {
          const validLocations = await tx.userLocation.findMany({
            where: { id: { in: input.locationIds } },
            select: { id: true },
          })

          if (validLocations.length !== input.locationIds.length) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Wybrano nieprawidłowe lokalizacje.',
            })
          }

          await tx.user.update({
            where: { id: input.userId },
            data: {
              locations: {
                set: validLocations.map((l) => ({ id: l.id })),
              },
            },
          })
        }

        /**
         * Synchronize Vectra module profile based on assigned module codes.
         * This must never rely on raw IDs or UI labels.
         */
        await syncVectraUser(tx, input.userId, hasVectra)

        return { ok: true }
      })
    }),

  /**
   * Updates user status (ACTIVE / SUSPENDED / INACTIVE).
   */
  updateUserStatus: adminOnly
    .input(
      z.object({
        userId: z.string(),
        status: z.nativeEnum(UserStatus),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { status: input.status },
      })
    }),

  /**
   * Soft-deletes user (Kadry archive).
   */
  archiveUser: adminOnly
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      })
    }),

  restoreUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: input.id },
        data: { status: 'ACTIVE' },
      })
    ),

  /** Toggle active / suspended */
  toggleUserStatus: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({ where: { id: input.id } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      })
    }),

  /** Delete user */
  deleteUser: adminOnly
    .input(
      z.object({
        id: z.string(),
        force: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.force) {
        await ctx.prisma.user.delete({ where: { id: input.id } })
        return { ok: true }
      }

      const anonEmail = `deleted-${input.id}@example.invalid`
      await ctx.prisma.user.update({
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
