import { adminOnly, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const normalizeRateCode = (code: string): string =>
  code.trim().toUpperCase().replace(/\s+/g, '')

const LEGACY_RATE_ALIAS_MAP: Record<string, string> = {
  '51': 'ZJDD',
}

const toCanonicalRateCode = (code: string): string => {
  const normalized = normalizeRateCode(code)
  return LEGACY_RATE_ALIAS_MAP[normalized] ?? normalized
}

export const rateDefinitionRouter = router({
  /** ✅ Get all rate definitions — for ADMIN and TECHNICIAN */
  getAllOplRates: loggedInEveryone.query(() =>
    prisma.oplRateDefinition.findMany({
      select: {
        id: true,
        code: true,
        amount: true,
      },
      orderBy: { code: 'asc' },
    })
  ),

  /** ✅ Create new rate — ADMIN only */
  createOplRate: adminOnly
    .input(
      z.object({
        code: z.string().min(1),
        amount: z.number().min(0, 'Stawka nie może być ujemna'),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedCode = normalizeRateCode(input.code)

      const existing = await prisma.oplRateDefinition.findFirst({
        where: {
          code: {
            equals: normalizedCode,
            mode: 'insensitive',
          },
        },
        select: { id: true, code: true },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Stawka dla kodu ${existing.code} już istnieje`,
        })
      }

      return prisma.oplRateDefinition.create({
        data: {
          code: normalizedCode,
          amount: input.amount,
        },
      })
    }),

  /** ✅ Edit existing rate — ADMIN only */
  editOplRate: adminOnly
    .input(
      z.object({
        id: z.string(),
        code: z.string().min(1),
        amount: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedCode = normalizeRateCode(input.code)

      const existing = await prisma.oplRateDefinition.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kod rozliczeniowy nie istnieje',
        })
      }

      const duplicate = await prisma.oplRateDefinition.findFirst({
        where: {
          id: { not: input.id },
          code: {
            equals: normalizedCode,
            mode: 'insensitive',
          },
        },
        select: { id: true, code: true },
      })

      if (duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Stawka dla kodu ${duplicate.code} już istnieje`,
        })
      }

      return prisma.oplRateDefinition.update({
        where: { id: input.id },
        data: {
          code: normalizedCode,
          amount: input.amount,
        },
      })
    }),

  /** ✅ Delete rate — ADMIN only */
  deleteOplRate: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.oplRateDefinition.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kod rozliczeniowy nie istnieje',
        })
      }

      const linkedEntriesCount = await prisma.oplOrderSettlementEntry.count({
        where: { code: existing.code },
      })

      if (linkedEntriesCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Nie można usunąć tej stawki, ponieważ jest użyta w rozliczonych zleceniach.',
        })
      }

      return prisma.oplRateDefinition.delete({
        where: { id: input.id },
      })
    }),

  normalizeOplRates: adminOnly.mutation(async () => {
    return prisma.$transaction(async (tx) => {
      const rates = await tx.oplRateDefinition.findMany({
        select: { id: true, code: true, amount: true },
        orderBy: { code: 'asc' },
      })

      if (!rates.length) {
        return { merged: 0, rewiredSettlements: 0, renamed: 0 }
      }

      const byCanonical = new Map<
        string,
        Array<{ id: string; code: string; amount: number }>
      >()

      for (const rate of rates) {
        const canonical = toCanonicalRateCode(rate.code)
        const list = byCanonical.get(canonical) ?? []
        list.push(rate)
        byCanonical.set(canonical, list)
      }

      let merged = 0
      let rewiredSettlements = 0
      let renamed = 0

      for (const [canonical, group] of byCanonical.entries()) {
        if (!group.length) continue

        const existingCanonical = group.find((rate) => rate.code === canonical)
        const maxAmount = Math.max(...group.map((rate) => rate.amount))

        const keeper = existingCanonical
          ? existingCanonical
          : await tx.oplRateDefinition.create({
              data: {
                code: canonical,
                amount: maxAmount,
              },
            })

        if (!existingCanonical) {
          renamed += 1
        }

        if (keeper.amount < maxAmount) {
          await tx.oplRateDefinition.update({
            where: { id: keeper.id },
            data: { amount: maxAmount },
          })
        }

        const duplicates = group.filter((rate) => rate.code !== keeper.code)

        if (!duplicates.length) continue

        for (const duplicate of duplicates) {
          const rewired = await tx.oplOrderSettlementEntry.updateMany({
            where: { code: duplicate.code },
            data: { code: keeper.code },
          })
          rewiredSettlements += rewired.count

          await tx.oplRateDefinition.delete({
            where: { id: duplicate.id },
          })
          merged += 1
        }
      }

      return { merged, rewiredSettlements, renamed }
    })
  }),
})
