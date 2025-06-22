import { deviceSchema } from '@/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { router } from '../../trpc'

export const deviceDefinitionRouter = router({
  // 📄 Get all device definitions
  getAllDefinitions: loggedInEveryone.query(() => {
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
  }),

  // ➕ Create new device definition
  createDefinition: adminOrCoord.input(deviceSchema).mutation(({ input }) => {
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
  editDefinition: adminOrCoord
    .input(
      z
        .object({
          id: z.string(),
          category: z.enum([
            'MODEM',
            'DECODER',
            'ONT',
            'AMPLIFIER',
            'UA',
            'OTHER',
          ]),
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
    .mutation(async ({ input }) => {
      // ✏️ Update the device definition entry
      await prisma.deviceDefinition.update({
        where: { id: input.id },
        data: {
          category: input.category,
          name: input.name.trim(),
          warningAlert: input.warningAlert,
          alarmAlert: input.alarmAlert,
          price: input.price,
        },
      })

      // 🔄 Also update all matching warehouse items
      await prisma.warehouse.updateMany({
        where: {
          itemType: 'DEVICE',
          category: input.category,
          name: input.name.trim(),
        },
        data: {
          price: input.price,
          warningAlert: input.warningAlert,
          alarmAlert: input.alarmAlert,
        },
      })

      return { success: true }
    }),

  // ❌ Delete definition
  deleteDefinition: adminOrCoord
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return prisma.deviceDefinition.delete({
        where: { id: input.id },
      })
    }),
})
