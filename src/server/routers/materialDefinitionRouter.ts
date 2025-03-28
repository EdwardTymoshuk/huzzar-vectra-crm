// src/server/routers/materialDefinitionRouter.ts
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const materialDefinitionRouter = router({
  getAll: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN']).query(() => {
    return prisma.materialDefinition.findMany({
      orderBy: { name: 'asc' },
    })
  }),

  create: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ name: z.string().min(2) }))
    .mutation(({ input }) => {
      return prisma.materialDefinition.create({
        data: { name: input.name },
      })
    }),

  edit: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string(), name: z.string().min(2) }))
    .mutation(({ input }) => {
      return prisma.materialDefinition.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),

  delete: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.materialDefinition.delete({
        where: { id: input.id },
      })
    }),
})
