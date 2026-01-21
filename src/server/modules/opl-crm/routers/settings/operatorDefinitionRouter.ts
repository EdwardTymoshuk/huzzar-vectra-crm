import { operatorSchema } from '@/app/(modules)/opl-crm/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'

export const operatorDefinitionRouter = router({
  // 📄 Get all operators definitions
  getAllOplOperatorDefinitions: loggedInEveryone.query(() => {
    return prisma.oplOperatorDefinition.findMany({
      orderBy: { operator: 'asc' },
    })
  }),

  // ➕ Create new operator definition
  createOplOperatorDefinition: adminOrCoord
    .input(operatorSchema)
    .mutation(({ input }) => {
      return prisma.oplOperatorDefinition.create({
        data: {
          operator: input.operator,
        },
      })
    }),

  // 📝 Edit operator definition
  editOplOperatorDefinition: adminOrCoord
    .input(
      z.object({
        oldOperator: z.string(),
        operator: z.string().min(2).max(50),
      })
    )
    .mutation(({ input }) => {
      return prisma.oplOperatorDefinition.update({
        where: { operator: input.oldOperator },
        data: { operator: input.operator },
      })
    }),

  // ❌ Delete definition
  deleteOplOperatorDefinition: adminOrCoord
    .input(z.object({ operator: z.string() }))
    .mutation(({ input }) => {
      return prisma.oplOperatorDefinition.delete({
        where: { operator: input.operator },
      })
    }),
})
