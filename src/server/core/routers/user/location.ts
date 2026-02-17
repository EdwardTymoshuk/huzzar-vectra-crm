//src/server/core/routers/user/location.ts

import { adminCoordOrWarehouse, adminOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import z from 'zod'

export const locationRouter = router({
  /** 📍 Get warehouse locations depending on role */
  getAllLocations: adminCoordOrWarehouse.query(async ({ ctx }) => {
    const { user } = ctx
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    switch (user.role) {
      case 'ADMIN':
        return ctx.prisma.location.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      case 'COORDINATOR':
      case 'WAREHOUSEMAN':
        return user.locations
      default:
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Technicians cannot access locations',
        })
    }
  }),

  /** 📍 Only user-assigned locations (for sidebar menu) */
  getUserLocations: adminCoordOrWarehouse.query(async ({ ctx }) => {
    const { user } = ctx
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    if (user.role === 'ADMIN') {
      return ctx.prisma.location.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    }

    if (user.role === 'WAREHOUSEMAN' || user.role === 'COORDINATOR') {
      return user.locations
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Technicians cannot access locations',
    })
  }),

  /** ➕ Create new warehouse location */
  createLocation: adminOnly
    .input(z.object({ id: z.string().min(2), name: z.string().min(2) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.location.create({
          data: { id: input.id.trim().toLowerCase(), name: input.name.trim() },
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Identyfikator lub nazwa lokalizacji już istnieje.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nie udało się dodać lokalizacji.',
        })
      }
    }),

  /** 🗑️ Delete warehouse location */
  deleteLocation: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.location.delete({
          where: { id: input.id },
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lokalizacja już nie istnieje.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nie udało się usunąć lokalizacji.',
        })
      }
    }),

  /** ✏️ Update warehouse location */
  updateLocation: adminOnly
    .input(z.object({ id: z.string(), name: z.string().min(2) }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.location.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    ),
})
