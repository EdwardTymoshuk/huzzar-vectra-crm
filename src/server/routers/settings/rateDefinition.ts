import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { roleProtectedProcedure } from '../../middleware'
import { router } from '../../trpc'

export const rateDefinitionRouter = router({
  getAllRates: roleProtectedProcedure(['ADMIN']).query(() => {
    return prisma.rateDefinition.findMany({
      select: {
        id: true,
        code: true,
        amount: true,
      },
      orderBy: { code: 'asc' },
    })
  }),

  createRate: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        code: z.string().min(1),
        amount: z.number().min(0, 'Stawka nie może być ujemna'),
      })
    )
    .mutation(({ input }) => {
      return prisma.rateDefinition.create({
        data: {
          code: input.code,
          amount: input.amount,
        },
      })
    }),

  editRate: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        id: z.string(),
        code: z.string().min(1),
        amount: z.number().min(0),
      })
    )
    .mutation(({ input }) => {
      return prisma.rateDefinition.update({
        where: { id: input.id },
        data: {
          code: input.code,
          amount: input.amount,
        },
      })
    }),

  deleteRate: roleProtectedProcedure(['ADMIN'])
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.rateDefinition.delete({
        where: { id: input.id },
      })
    }),
})
