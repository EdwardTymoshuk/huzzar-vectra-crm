import { operatorSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { router } from '../../../trpc'

export const operatorDefinitionRouter = router({
  // 📄 Get all operators definitions – dostęp dla każdego zalogowanego
  getAllDefinitions: loggedInEveryone.query(() => {
    return prisma.operatorDefinition.findMany({
      orderBy: { operator: 'asc' },
    })
  }),

  // ➕ Create new operator definition – tylko ADMIN i KOORDYNATOR
  createDefinition: adminOrCoord.input(operatorSchema).mutation(({ input }) => {
    return prisma.operatorDefinition.create({
      data: {
        operator: input.operator,
      },
    })
  }),

  // 📝 Edit operator definition – tylko ADMIN i KOORDYNATOR
  editDefinition: adminOrCoord
    .input(
      z.object({
        oldOperator: z.string(),
        operator: z.string().min(2).max(50),
      })
    )
    .mutation(({ input }) => {
      return prisma.operatorDefinition.update({
        where: { operator: input.oldOperator },
        data: { operator: input.operator },
      })
    }),

  // ❌ Delete definition – tylko ADMIN i KOORDYNATOR
  deleteDefinition: adminOrCoord
    .input(z.object({ operator: z.string() }))
    .mutation(({ input }) => {
      return prisma.operatorDefinition.delete({
        where: { operator: input.operator },
      })
    }),
})
