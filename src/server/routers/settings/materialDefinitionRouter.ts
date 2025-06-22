// src/server/routers/materialDefinitionRouter.ts
import { materialSchema } from '@/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { router } from '../../trpc'

export const materialDefinitionRouter = router({
  // 📦 Get all material definitions (accessible by everyone logged in)
  getAll: loggedInEveryone.query(() => {
    return prisma.materialDefinition.findMany({
      orderBy: { name: 'asc' },
    })
  }),
  // ➕ Create new material definition
  create: adminOrCoord.input(materialSchema).mutation(({ input }) => {
    return prisma.materialDefinition.create({
      data: {
        name: input.name.trim(),
        unit: input.unit,
        index: input.index.trim(),
        warningAlert: input.warningAlert,
        alarmAlert: input.alarmAlert,
        price: input.price,
      },
    })
  }),

  // 📝 Edit existing material definition
  edit: adminOrCoord
    .input(
      z
        .object({
          id: z.string(),
          name: z.string().min(2),
          index: z.string().min(1),
          unit: z.enum(['PIECE', 'METER']),
          warningAlert: z.number().min(1),
          alarmAlert: z.number().min(1),
          price: z.number().min(0).default(0),
        })
        .refine((data) => data.alarmAlert < data.warningAlert, {
          message: 'Critical alert must be lower than warning alert',
          path: ['alarmAlert'],
        })
    )
    .mutation(({ input }) => {
      return prisma.materialDefinition.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          index: input.index.trim(),
          unit: input.unit,
          warningAlert: input.warningAlert,
          alarmAlert: input.alarmAlert,
          price: input.price,
        },
      })
    }),

  // ❌ Delete material definition
  delete: adminOrCoord
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.materialDefinition.delete({
        where: { id: input.id },
      })
    }),
})
