import { requireOplModule } from '@/server/middleware/oplMiddleware'
import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const ABSENCE_TYPES = ['VACATION', 'DAY_OFF', 'SICK_LEAVE', 'OTHER'] as const

const normalizeDayRange = (from: Date, to: Date) => {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const absenceInput = z.object({
  technicianId: z.string().min(1),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  type: z.enum(ABSENCE_TYPES),
  reason: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
})

type AbsenceRow = {
  id: string
  technicianId: string
  technicianName: string
  dateFrom: Date
  dateTo: Date
  type: (typeof ABSENCE_TYPES)[number]
  reason: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
  createdByName: string | null
}

export const absencesUserRouter = router({
  getTechnicianAbsences: adminOrCoord
    .use(requireOplModule)
    .input(
      z
        .object({
          technicianId: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          activeOnly: z.boolean().optional().default(true),
          limit: z.number().min(1).max(500).optional().default(200),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const fromDate = input?.from ? new Date(input.from) : null
      const toDate = input?.to ? new Date(input.to) : null
      const limit = input?.limit ?? 200

      const rows = await ctx.prisma.$queryRaw<AbsenceRow[]>(Prisma.sql`
        SELECT
          a."id",
          a."technicianId",
          tu."name" AS "technicianName",
          a."dateFrom",
          a."dateTo",
          a."type"::text AS "type",
          a."reason",
          a."active",
          a."createdAt",
          a."updatedAt",
          cu."name" AS "createdByName"
        FROM "opl"."OplTechnicianAbsence" a
        JOIN "opl"."OplUser" t ON t."userId" = a."technicianId"
        JOIN "public"."User" tu ON tu."id" = t."userId"
        LEFT JOIN "opl"."OplUser" c ON c."userId" = a."createdById"
        LEFT JOIN "public"."User" cu ON cu."id" = c."userId"
        WHERE
          (${input?.activeOnly ?? true} = false OR a."active" = true)
          AND (${input?.technicianId ?? null}::text IS NULL OR a."technicianId" = ${input?.technicianId ?? null}::text)
          AND (${fromDate ? true : false} = false OR a."dateTo" >= ${fromDate ?? new Date(0)})
          AND (${toDate ? true : false} = false OR a."dateFrom" <= ${toDate ?? new Date(0)})
        ORDER BY a."dateFrom" ASC, a."createdAt" DESC
        LIMIT ${limit}
      `)

      return rows
    }),

  createTechnicianAbsence: adminOrCoord
    .use(requireOplModule)
    .input(absenceInput)
    .mutation(async ({ ctx, input }) => {
      const from = new Date(input.dateFrom)
      const to = new Date(input.dateTo)
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nieprawidłowy zakres dat.',
        })
      }

      const { start, end } = normalizeDayRange(from, to)
      if (start > end) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data końcowa nie może być wcześniejsza niż początkowa.',
        })
      }

      const techRows = await ctx.prisma.$queryRaw<Array<{ userId: string }>>(Prisma.sql`
        SELECT ou."userId"
        FROM "opl"."OplUser" ou
        JOIN "public"."User" u ON u."id" = ou."userId"
        WHERE ou."userId" = ${input.technicianId}
          AND ou."active" = true
          AND u."role" = 'TECHNICIAN'
        LIMIT 1
      `)

      if (techRows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Technik nie istnieje.' })
      }

      await ctx.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "opl"."OplTechnicianAbsence"
          ("id", "technicianId", "dateFrom", "dateTo", "type", "reason", "active", "createdAt", "updatedAt", "createdById")
        VALUES
          (gen_random_uuid()::text, ${input.technicianId}, ${start}, ${end}, ${input.type}::"opl"."OplTechnicianAbsenceType", ${input.reason?.trim() || null}, ${input.active ?? true}, NOW(), NOW(), ${ctx.user?.id ?? null})
      `)

      return { success: true }
    }),

  updateTechnicianAbsence: adminOrCoord
    .use(requireOplModule)
    .input(
      absenceInput.extend({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const from = new Date(input.dateFrom)
      const to = new Date(input.dateTo)
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nieprawidłowy zakres dat.' })
      }
      const { start, end } = normalizeDayRange(from, to)
      if (start > end) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data końcowa nie może być wcześniejsza niż początkowa.',
        })
      }

      const updatedRows = await ctx.prisma.$executeRaw(Prisma.sql`
        UPDATE "opl"."OplTechnicianAbsence"
        SET
          "technicianId" = ${input.technicianId},
          "dateFrom" = ${start},
          "dateTo" = ${end},
          "type" = ${input.type}::"opl"."OplTechnicianAbsenceType",
          "reason" = ${input.reason?.trim() || null},
          "active" = ${input.active ?? true},
          "updatedAt" = NOW()
        WHERE "id" = ${input.id}
      `)

      if (updatedRows === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Wpis nie istnieje.' })
      }

      return { success: true }
    }),

  deleteTechnicianAbsence: adminOrCoord
    .use(requireOplModule)
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$executeRaw(Prisma.sql`
        DELETE FROM "opl"."OplTechnicianAbsence" WHERE "id" = ${input.id}
      `)
      return { success: true }
    }),

  getAbsentTechnicianIdsForDate: adminOrCoord
    .use(requireOplModule)
    .input(z.object({ date: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const date = new Date(input.date)
      if (Number.isNaN(date.getTime())) return []
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const rows = await ctx.prisma.$queryRaw<Array<{ technicianId: string }>>(Prisma.sql`
        SELECT DISTINCT "technicianId"
        FROM "opl"."OplTechnicianAbsence"
        WHERE "active" = true
          AND "dateFrom" <= ${dayEnd}
          AND "dateTo" >= ${dayStart}
      `)

      return rows.map((r) => r.technicianId)
    }),
})
