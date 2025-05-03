import { operatorSchema } from '@/lib/schema'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const operatorDefinitionRouter = router({
  // 📄 Get all operators definitions
  getAllDefinitions: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN']).query(
    () => {
      return prisma.operatorDefinition.findMany({
        orderBy: { operator: 'asc' },
      })
    }
  ),

  // ➕ Create new operator definition
  createDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(operatorSchema)
    .mutation(({ input }) => {
      return prisma.operatorDefinition.create({
        data: {
          operator: input.operator,
        },
      })
    }),

  // 📝 Edit operator definition
  editDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
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

  // ❌ Delete definition
  deleteDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ operator: z.string() }))
    .mutation(({ input }) => {
      return prisma.operatorDefinition.delete({
        where: { operator: input.operator },
      })
    }),
})
