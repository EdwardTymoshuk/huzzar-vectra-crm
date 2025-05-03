import { deviceSchema } from '@/lib/schema'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const deviceDefinitionRouter = router({
  // 📄 Get all device definitions
  getAllDefinitions: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN']).query(
    () => {
      return prisma.deviceDefinition.findMany({
        select: {
          id: true,
          category: true,
          name: true,
          warningAlert: true,
          alarmAlert: true,
          price: true,
        },
        orderBy: { name: 'asc' },
      })
    }
  ),

  // ➕ Create new device definition
  createDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(deviceSchema)
    .mutation(({ input }) => {
      return prisma.deviceDefinition.create({
        data: {
          category: input.category,
          name: input.name.trim(),
          warningAlert: input.warningAlert,
          alarmAlert: input.alarmAlert,
          price: input.price,
        },
      })
    }),

  // 📝 Edit device definition
  editDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(
      z
        .object({
          id: z.string(),
          category: z.enum(['MODEM', 'DECODER', 'ONT', 'AMPLIFIER', 'OTHER']),
          name: z.string().min(2),
          warningAlert: z.number().min(1),
          alarmAlert: z.number().min(1),
          price: z.number().min(0).default(0),
        })
        .refine((data) => data.alarmAlert < data.warningAlert, {
          message: 'Alarm alert musi być mniejszy niż warning alert',
          path: ['alarmAlert'],
        })
    )
    .mutation(({ input }) => {
      return prisma.deviceDefinition.update({
        where: { id: input.id },
        data: {
          category: input.category,
          name: input.name.trim(),
          warningAlert: input.warningAlert,
          alarmAlert: input.alarmAlert,
          price: input.price,
        },
      })
    }),

  // ❌ Delete definition
  deleteDefinition: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.deviceDefinition.delete({
        where: { id: input.id },
      })
    }),
})
