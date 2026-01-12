import { operatorSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'

export const operatorDefinitionRouter = router({
  // 📄 Get all operators definitions
  getAllDefinitions: loggedInEveryone.query(() => {
    return prisma.vectraOperatorDefinition.findMany({
      orderBy: { operator: 'asc' },
    })
  }),

  // ➕ Create new operator definition
  createDefinition: adminOrCoord.input(operatorSchema).mutation(({ input }) => {
    return prisma.vectraOperatorDefinition.create({
      data: {
        operator: input.operator,
      },
    })
  }),

  // 📝 Edit operator definition
  editDefinition: adminOrCoord
    .input(
      z.object({
        oldOperator: z.string(),
        operator: z.string().min(2).max(50),
      })
    )
    .mutation(({ input }) => {
      return prisma.vectraOperatorDefinition.update({
        where: { operator: input.oldOperator },
        data: { operator: input.operator },
      })
    }),

  // ❌ Delete definition
  deleteDefinition: adminOrCoord
    .input(z.object({ operator: z.string() }))
    .mutation(({ input }) => {
      return prisma.vectraOperatorDefinition.delete({
        where: { operator: input.operator },
      })
    }),
})
