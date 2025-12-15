// server/routers/user/misc.ts
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { getUserOrThrow } from '../../_helpers/getUserOrThrow'

/**
 * miscUserRouter – provides auxiliary user queries (e.g., technician listings).
 */
export const miscUserRouter = router({
  /** 👥 Returns all technicians except the currently logged-in user (for transfers) */
  getOtherTechnicians: loggedInEveryone
    .input(z.object({ excludeId: z.string().optional() }))
    .query(({ ctx, input }) => {
      const user = getUserOrThrow(ctx)

      return prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          id: { not: input.excludeId ?? user.id },
          status: 'ACTIVE',
        },
        orderBy: { name: 'asc' },
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
    }),

  /** 📋 Returns list of all technicians, optionally filtered by status */
  getTechnicians: adminCoordOrWarehouse
    .input(
      z.object({
        status: z
          .enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'])
          .optional(),
      })
    )
    .query(({ input }) =>
      prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          ...(input.status ? { status: input.status } : {}),
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          name: true,
          role: true,
          status: true,
          identyficator: true,
          locations: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      })
    ),

  /** 🔍 Search technicians by name (case-insensitive and normalized) */
  searchTechniciansByName: adminCoordOrWarehouse
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      // Normalize query: trim spaces and remove trailing parentheses
      const cleaned = input.query
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\([^)]*\)\s*$/, '')

      return prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          name: {
            contains: cleaned,
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
        take: input.limit,
        select: {
          id: true,
          name: true,
          status: true,
          phoneNumber: true,
          email: true,
          locations: { select: { id: true, name: true } },
        },
      })
    }),
})
