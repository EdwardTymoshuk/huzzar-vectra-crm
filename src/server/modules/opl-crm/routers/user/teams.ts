import { requireOplModule } from '@/server/middleware/oplMiddleware'
import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const teamInputBase = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  technician1Id: z.string().min(1),
  technician2Id: z.string().min(1),
  active: z.boolean().optional(),
})

const normalizePairKey = (a: string, b: string) =>
  [a, b].sort((x, y) => x.localeCompare(y)).join('__')

export const teamsUserRouter = router({
  getTeams: adminOrCoord
    .use(requireOplModule)
    .input(
      z
        .object({
          activeOnly: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const activeOnly = input?.activeOnly ?? false

      const rows = await ctx.prisma.oplTeam.findMany({
        where: activeOnly ? { active: true } : undefined,
        include: {
          technician1: {
            select: { userId: true, user: { select: { id: true, name: true } } },
          },
          technician2: {
            select: { userId: true, user: { select: { id: true, name: true } } },
          },
          createdBy: {
            select: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: [
          { active: 'desc' },
          { technician1: { user: { name: 'asc' } } },
          { technician2: { user: { name: 'asc' } } },
        ],
      })

      return rows.map((row) => ({
        id: row.id,
        name:
          row.name?.trim() ||
          `${row.technician1.user.name} / ${row.technician2.user.name}`,
        active: row.active,
        technician1Id: row.technician1Id,
        technician2Id: row.technician2Id,
        technician1Name: row.technician1.user.name,
        technician2Name: row.technician2.user.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdByName: row.createdBy?.user.name ?? null,
      }))
    }),

  createTeam: adminOrCoord
    .use(requireOplModule)
    .input(teamInputBase)
    .mutation(async ({ ctx, input }) => {
      if (input.technician1Id === input.technician2Id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ekipa musi składać się z dwóch różnych techników.',
        })
      }

      const technicians = await ctx.prisma.oplUser.findMany({
        where: {
          userId: { in: [input.technician1Id, input.technician2Id] },
          active: true,
          user: { role: 'TECHNICIAN' },
        },
        select: { userId: true },
      })

      if (technicians.length !== 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Obaj członkowie ekipy muszą być aktywnymi technikami OPL.',
        })
      }

      const existing = await ctx.prisma.oplTeam.findMany({
        select: { id: true, technician1Id: true, technician2Id: true },
      })
      const newKey = normalizePairKey(input.technician1Id, input.technician2Id)
      if (
        existing.some(
          (row) => normalizePairKey(row.technician1Id, row.technician2Id) === newKey
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Taka ekipa już istnieje.',
        })
      }

      return ctx.prisma.oplTeam.create({
        data: {
          name: input.name?.trim() || null,
          active: input.active ?? true,
          technician1Id: input.technician1Id,
          technician2Id: input.technician2Id,
          createdById: ctx.user?.id ?? null,
        },
      })
    }),

  updateTeam: adminOrCoord
    .use(requireOplModule)
    .input(
      teamInputBase.extend({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.technician1Id === input.technician2Id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ekipa musi składać się z dwóch różnych techników.',
        })
      }

      const team = await ctx.prisma.oplTeam.findUnique({ where: { id: input.id } })
      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ekipa nie istnieje.' })
      }

      const technicians = await ctx.prisma.oplUser.findMany({
        where: {
          userId: { in: [input.technician1Id, input.technician2Id] },
          active: true,
          user: { role: 'TECHNICIAN' },
        },
        select: { userId: true },
      })
      if (technicians.length !== 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Obaj członkowie ekipy muszą być aktywnymi technikami OPL.',
        })
      }

      const existing = await ctx.prisma.oplTeam.findMany({
        where: { NOT: { id: input.id } },
        select: { id: true, technician1Id: true, technician2Id: true },
      })
      const nextKey = normalizePairKey(input.technician1Id, input.technician2Id)
      if (
        existing.some(
          (row) => normalizePairKey(row.technician1Id, row.technician2Id) === nextKey
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Taka ekipa już istnieje.',
        })
      }

      return ctx.prisma.oplTeam.update({
        where: { id: input.id },
        data: {
          name: input.name?.trim() || null,
          active: input.active ?? team.active,
          technician1Id: input.technician1Id,
          technician2Id: input.technician2Id,
        },
      })
    }),

  deleteTeam: adminOrCoord
    .use(requireOplModule)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.oplTeam.findUnique({ where: { id: input.id } })
      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ekipa nie istnieje.' })
      }
      await ctx.prisma.oplTeam.delete({ where: { id: input.id } })
      return { success: true }
    }),
})

