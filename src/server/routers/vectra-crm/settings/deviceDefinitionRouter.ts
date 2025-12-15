import { deviceSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { prisma } from '@/utils/prisma'
import { DeviceCategory } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { router } from '../../../trpc'

export const deviceDefinitionRouter = router({
  // 📄 Get all device definitions
  getAllDefinitions: loggedInEveryone.query(() => {
    return prisma.vectraDeviceDefinition.findMany({
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

  // 📂 Get all unique categories
  getAllCategories: loggedInEveryone.query(async () => {
    return Object.values(DeviceCategory)
  }),

  // ➕ Create new device definition
  createDefinition: adminOrCoord.input(deviceSchema).mutation(({ input }) => {
    return prisma.vectraDeviceDefinition.create({
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
          category: z.nativeEnum(DeviceCategory),
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
      await prisma.vectraDeviceDefinition.update({
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
      await prisma.vectraWarehouse.updateMany({
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
      return prisma.vectraDeviceDefinition.delete({
        where: { id: input.id },
      })
    }),
  /**
   * 📘 Get item definition (DEVICE or MATERIAL) by name.
   * Used in warehouse detail page header.
   *
   * Returns:
   * {
   *   name: string
   *   category: string | null     // DEVICE category
   *   index: string | null        // MATERIAL index
   *   price: number | null
   *   itemType: 'DEVICE' | 'MATERIAL'
   * }
   */
  getItemDefinition: loggedInEveryone
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ input }) => {
      const name = input.name.trim()

      // Try to match DEVICE definition
      const device = await prisma.vectraDeviceDefinition.findFirst({
        where: { name },
        select: {
          name: true,
          category: true,
          price: true,
        },
      })

      if (device) {
        return {
          name: device.name,
          category: device.category,
          index: null,
          price: device.price ?? 0,
          itemType: 'DEVICE' as const,
        }
      }

      // Try to match MATERIAL definition
      const material = await prisma.vectraMaterialDefinition.findFirst({
        where: { name },
        select: {
          name: true,
          index: true,
          price: true,
        },
      })

      if (material) {
        return {
          name: material.name,
          category: null,
          index: material.index,
          price: material.price ?? 0,
          itemType: 'MATERIAL' as const,
        }
      }

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Nie znaleziono definicji dla: ${name}`,
      })
    }),
})
