import { prisma } from '@/utils/prisma'
import { DeviceCategory, WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const warehouseRouter = router({
  // 📥 Add new warehouse items (RECEIVED)
  addItems: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(
      z.object({
        items: z.array(
          z.object({
            type: z.nativeEnum(WarehouseItemType),
            name: z.string(),
            category: z.nativeEnum(DeviceCategory).optional(),
            serialNumber: z.string().optional(),
            quantity: z.number().optional(), // only required for MATERIAL
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized')
      }

      for (const item of input.items) {
        // Create warehouse item
        const createdItem = await prisma.warehouse.create({
          data: {
            itemType: item.type,
            name: item.name,
            category: item.type === 'DEVICE' ? item.category : undefined,
            serialNumber:
              item.type === 'DEVICE' ? item.serialNumber : undefined,
            quantity: item.type === 'MATERIAL' ? item.quantity ?? 1 : 1,
            price: 0,
            status: 'AVAILABLE',
          },
        })

        // Create warehouse history entry
        await prisma.warehouseHistory.create({
          data: {
            warehouseItemId: createdItem.id,
            action: 'RECEIVED',
            performedById: ctx.user.id,
          },
        })
      }

      return { success: true }
    }),
  // 📤 Issue items (ASSIGNED)
  issueItems: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(
      z.object({
        assignedToId: z.string(),
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({
              type: z.literal('DEVICE'),
              id: z.string(),
            }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { assignedToId, items } = input
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of items) {
        if (item.type === 'DEVICE') {
          // Update device status and assignment
          const updated = await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              status: 'ASSIGNED',
              assignedToId,
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: updated.id,
              action: 'ISSUED',
              performedById: userId,
              assignedToId,
            },
          })
        } else if (item.type === 'MATERIAL') {
          // Decrease material quantity
          const existing = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })

          if (!existing || existing.quantity < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Niewystarczająca ilość materiału: ${existing?.name}`,
            })
          }

          await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'ISSUED',
              performedById: userId,
              assignedToId,
              quantity: item.quantity,
            },
          })
        }
      }

      return { success: true }
    }),

  // 🔁 Return item to warehouse
  returnItem: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(
      z.object({
        warehouseItemId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const userId = ctx.user.id

      const item = await prisma.warehouse.update({
        where: { id: input.warehouseItemId },
        data: {
          assignedToId: null,
          assignedOrderId: null,
          status: 'RETURNED',
        },
      })

      await prisma.warehouseHistory.create({
        data: {
          warehouseItemId: item.id,
          action: 'RETURNED',
          performedById: userId,
          notes: input.notes,
        },
      })

      return item
    }),

  // 📄 Get all warehouse items
  getAll: protectedProcedure.query(() => {
    return prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }),

  // 📜 Get history for a specific warehouse item
  getHistory: protectedProcedure
    .input(z.object({ warehouseItemId: z.string() }))
    .query(({ input }) => {
      return prisma.warehouseHistory.findMany({
        where: { warehouseItemId: input.warehouseItemId },
        include: {
          performedBy: true,
          assignedTo: true,
        },
        orderBy: { actionDate: 'desc' },
      })
    }),

  // ❌ Delete item from warehouse
  deleteItem: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const item = await prisma.warehouse.findUnique({
        where: { id: input.id },
      })

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' })
      }

      // Delete all related history entries first
      await prisma.warehouseHistory.deleteMany({
        where: { warehouseItemId: input.id },
      })

      // Delete item from warehouse
      await prisma.warehouse.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // 📦 Get all warehouse items by name
  getItemsByName: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ input }) => {
      return prisma.warehouse.findMany({
        where: {
          name: input.name,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // 📦 Get all warehouse items with history by name
  getByNameWithHistory: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return prisma.warehouse.findMany({
        where: { name: input.name },
        include: {
          history: {
            include: {
              performedBy: true,
              assignedTo: true,
            },
            orderBy: { actionDate: 'asc' },
          },
          assignedTo: true,
          assignedOrder: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),
  // 🔍 Get warehouse item by serial number
  getBySerialNumber: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(z.object({ serial: z.string().min(1) }))
    .query(async ({ input }) => {
      const item = await prisma.warehouse.findFirst({
        where: {
          serialNumber: {
            equals: input.serial,
            mode: 'insensitive',
          },
        },
        include: {
          assignedTo: true,
        },
      })

      return item
    }),
})
