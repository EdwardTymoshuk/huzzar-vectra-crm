import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const deviceDefinitionRouter = router({
  // Get all device definitions (podkategorie)
  // e.g. for grouping them by category
  getAllDefinitions: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN']).query(
    () => {
      return prisma.deviceDefinition.findMany({
        select: {
          id: true,
          category: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      })
    }
  ),

  // Create new definition (podkategoria)
  createDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(
      z.object({
        category: z.enum(['MODEM', 'DECODER', 'ONT', 'AMPLIFIER', 'OTHER']),
        name: z.string().min(2),
      })
    )
    .mutation(({ input }) => {
      return prisma.deviceDefinition.create({
        data: {
          category: input.category,
          name: input.name,
        },
      })
    }),

  // Edit existing definition
  editDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(
      z.object({
        id: z.string(),
        category: z.enum(['MODEM', 'DECODER', 'ONT', 'AMPLIFIER', 'OTHER']),
        name: z.string().min(2),
      })
    )
    .mutation(({ input }) => {
      return prisma.deviceDefinition.update({
        where: { id: input.id },
        data: {
          category: input.category,
          name: input.name,
        },
      })
    }),

  // Delete definition
  deleteDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.deviceDefinition.delete({
        where: { id: input.id },
      })
    }),
})
