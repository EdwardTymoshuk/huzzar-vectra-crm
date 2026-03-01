import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const zoneInput = z.object({
  zone: z.string().trim().min(2).max(80),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
})

const zoneRowSchema = z.object({
  zone: z.string(),
  active: z.boolean(),
  sortOrder: z.number(),
})

const isMissingZoneTableError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return (
    message.includes('OplZoneDefinition') &&
    (message.includes('does not exist') || message.includes('42P01'))
  )
}

export const zoneDefinitionRouter = router({
  getAllOplZoneDefinitions: loggedInEveryone.query(async () => {
    const rows = await (async () => {
      try {
        return await prisma.$queryRaw<
          Array<{ zone: string; active: boolean; sortOrder: number }>
        >(Prisma.sql`
          SELECT "zone", "active", "sortOrder"
          FROM "opl"."OplZoneDefinition"
          ORDER BY "active" DESC, "sortOrder" ASC, "zone" ASC
        `)
      } catch (error) {
        if (isMissingZoneTableError(error)) return []
        throw error
      }
    })()

    return rows.map((row) => zoneRowSchema.parse(row))
  }),

  createOplZoneDefinition: adminOrCoord.input(zoneInput).mutation(async ({ input }) => {
    try {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "opl"."OplZoneDefinition" ("zone", "active", "sortOrder")
          VALUES (${input.zone}, ${input.active}, ${input.sortOrder})
        `
      )
      return { ok: true }
    } catch (error) {
      throw new TRPCError({
        code: isMissingZoneTableError(error) ? 'PRECONDITION_FAILED' : 'CONFLICT',
        message: isMissingZoneTableError(error)
          ? 'Tabela stref nie istnieje w bazie. Wykonaj migrację/db push.'
          : 'Taka strefa już istnieje albo nie udało się jej dodać.',
        cause: error,
      })
    }
  }),

  editOplZoneDefinition: adminOrCoord
    .input(
      z.object({
        oldZone: z.string().trim().min(2).max(80),
        zone: z.string().trim().min(2).max(80),
        active: z.boolean(),
        sortOrder: z.number().int().min(0).max(999),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "opl"."OplZoneDefinition"
            SET "zone" = ${input.zone},
                "active" = ${input.active},
                "sortOrder" = ${input.sortOrder}
            WHERE "zone" = ${input.oldZone}
          `
        )
      } catch (error) {
        if (isMissingZoneTableError(error)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Tabela stref nie istnieje w bazie. Wykonaj migrację/db push.',
          })
        }
        throw error
      }
      return { ok: true }
    }),

  deleteOplZoneDefinition: adminOrCoord
    .input(z.object({ zone: z.string().trim().min(2).max(80) }))
    .mutation(async ({ input }) => {
      try {
        await prisma.$executeRaw(
          Prisma.sql`
            DELETE FROM "opl"."OplZoneDefinition"
            WHERE "zone" = ${input.zone}
          `
        )
      } catch (error) {
        if (isMissingZoneTableError(error)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Tabela stref nie istnieje w bazie. Wykonaj migrację/db push.',
          })
        }
        throw error
      }
      return { ok: true }
    }),
})
