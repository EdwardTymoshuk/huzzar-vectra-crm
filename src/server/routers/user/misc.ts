// server/routers/user/misc.ts
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
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
  ),

  /** List of technicians */
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

  /** Search technician(s) by name (case-insensitive, normalized) */
  searchTechniciansByName: adminCoordOrWarehouse
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      // Normalize: trim, collapse spaces, remove trailing "(...)" from query
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
