import { adminOnly, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

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
    .mutation(({ input }) =>
      prisma.oplRateDefinition.create({
        data: {
          code: input.code,
          amount: input.amount,
        },
      })
    ),

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
      const existing = await prisma.oplRateDefinition.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kod rozliczeniowy nie istnieje',
        })
      }

      return prisma.oplRateDefinition.update({
        where: { id: input.id },
        data: {
          code: input.code,
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

      return prisma.oplRateDefinition.delete({
        where: { id: input.id },
      })
    }),
})
