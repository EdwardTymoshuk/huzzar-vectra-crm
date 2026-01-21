// src/server/modules/vectra-crm/routers/user/misc.ts
import { mapTechnicianToEmployeeVM } from '@/server/core/helpers/mappers/mapTechnicianToEmployeeVM'
import { mapTechnicianToVM } from '@/server/core/helpers/mappers/mapTechnicianToVM'
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { z } from 'zod'

/**
 * miscUserRouter
 * ------------------------------------------------------
 * Auxiliary user-related queries scoped strictly
 * to the VECTRA CRM domain.
 */
export const miscUserRouter = router({
  /**
   * Returns all active VECTRA technicians except
   * the currently logged-in user (used for transfers).
   */
  getOtherTechnicians: loggedInEveryone
    .input(
      z.object({
        excludeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentUser = getCoreUserOrThrow(ctx)

      const users = await ctx.prisma.vectraUser.findMany({
        where: {
          active: true,
          user: {
            role: 'TECHNICIAN',
            status: 'ACTIVE',
            id: {
              not: input.excludeId ?? currentUser.id,
            },
          },
        },
        orderBy: {
          user: { name: 'asc' },
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              identyficator: true,
              status: true,
            },
          },
        },
      })

      return users.map(mapTechnicianToVM)
    }),

  getTechnicians: adminCoordOrWarehouse
    .input(
      z.object({
        status: z
          .enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const technicians = await ctx.prisma.vectraUser.findMany({
        where: {
          active: true,
          user: {
            role: 'TECHNICIAN',
            ...(input.status ? { status: input.status } : {}),
          },
        },
        orderBy: {
          user: { name: 'asc' },
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              role: true,
              status: true,
              identyficator: true,
              locations: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      return technicians.map(mapTechnicianToEmployeeVM)
    }),
  /**
   * Searches VECTRA technicians by name
   * using a normalized, case-insensitive query.
   */
  searchTechniciansByName: adminCoordOrWarehouse
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(({ ctx, input }) => {
      /**
       * Normalize query:
       * - trim whitespace
       * - collapse multiple spaces
       * - remove trailing parentheses
       */
      const cleaned = input.query
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\([^)]*\)\s*$/, '')

      return ctx.prisma.vectraUser.findMany({
        where: {
          active: true,
          user: {
            role: 'TECHNICIAN',
            name: {
              contains: cleaned,
              mode: 'insensitive',
            },
          },
        },
        orderBy: {
          user: { name: 'asc' },
        },
        take: input.limit,
        select: {
          user: {
            select: {
              id: true,
              name: true,
              status: true,
              phoneNumber: true,
              email: true,
              locations: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    }),
})
