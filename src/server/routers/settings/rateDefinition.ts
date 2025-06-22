import { adminOnly, loggedInEveryone } from '@/server/roleHelpers'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { router } from '../../trpc'

export const rateDefinitionRouter = router({
  /** ✅ Get all rate definitions — for ADMIN and TECHNICIAN */
  getAllRates: loggedInEveryone.query(() =>
    prisma.rateDefinition.findMany({
      select: {
        id: true,
        code: true,
        amount: true,
      },
      orderBy: { code: 'asc' },
    })
  ),

  /** ✅ Create new rate — ADMIN only */
  createRate: adminOnly
    .input(
      z.object({
        code: z.string().min(1),
        amount: z.number().min(0, 'Stawka nie może być ujemna'),
      })
    )
    .mutation(({ input }) =>
      prisma.rateDefinition.create({
        data: {
          code: input.code,
          amount: input.amount,
        },
      })
    ),

  /** ✅ Edit existing rate — ADMIN only */
  editRate: adminOnly
    .input(
      z.object({
        id: z.string(),
        code: z.string().min(1),
        amount: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.rateDefinition.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kod rozliczeniowy nie istnieje',
        })
      }

      return prisma.rateDefinition.update({
        where: { id: input.id },
        data: {
          code: input.code,
          amount: input.amount,
        },
      })
    }),

  /** ✅ Delete rate — ADMIN only */
  deleteRate: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.rateDefinition.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kod rozliczeniowy nie istnieje',
        })
      }

      return prisma.rateDefinition.delete({
        where: { id: input.id },
      })
    }),
})
