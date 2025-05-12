import { prisma } from '@/utils/prisma'
import {
  DeviceCategory,
  WarehouseAction,
  WarehouseItemType,
} from '@prisma/client'
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
            quantity: z.number().optional(), // only for MATERIAL
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error('Unauthorized')

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          const def = await prisma.deviceDefinition.findFirst({
            where: {
              name: item.name,
              category: item.category ?? 'OTHER',
            },
          })

          if (!def || def.price === null) {
            throw new Error(
              `Missing device definition or price for ${item.name}`
            )
          }

          const created = await prisma.warehouse.create({
            data: {
              itemType: 'DEVICE',
              name: item.name,
              category: item.category,
              serialNumber: item.serialNumber?.trim().toUpperCase(),
              quantity: 1,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: ctx.user.id,
              notes: input.notes || undefined,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const def = await prisma.materialDefinition.findFirst({
            where: { name: item.name },
          })

          if (!def || def.price === null) {
            throw new Error(
              `Missing material definition or price for ${item.name}`
            )
          }

          const created = await prisma.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: item.name,
              quantity: item.quantity ?? 1,
              unit: def.unit,
              index: def.index,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: ctx.user.id,
              quantity: item.quantity ?? 1,
              notes: input.notes || undefined,
            },
          })
        }
      }

      return { success: true }
    }),

  // 📤 Issue items to technician (ASSIGNED)
  issueItems: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(
      z.object({
        assignedToId: z.string(),
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { assignedToId, items, notes } = input
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of items) {
        if (item.type === 'DEVICE') {
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
              notes: notes || undefined,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const warehouseMaterial = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })

          if (
            !warehouseMaterial ||
            warehouseMaterial.quantity < item.quantity
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Not enough material: ${warehouseMaterial?.name}`,
            })
          }

          // Decrease quantity in warehouse
          await prisma.warehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          // Create assigned copy for technician
          await prisma.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: warehouseMaterial.name,
              quantity: item.quantity,
              unit: warehouseMaterial.unit,
              index: warehouseMaterial.index,
              price: warehouseMaterial.price,
              category: warehouseMaterial.category,
              assignedToId,
              status: 'ASSIGNED',
            },
          })

          // 🧾 Save history using the original warehouse item ID
          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id, // 👈 this is key: reference original item
              action: 'ISSUED',
              performedById: userId,
              assignedToId,
              quantity: item.quantity,
              notes: notes || undefined,
            },
          })
        }
      }

      return { success: true }
    }),

  // 🔁 Return material/device from technician
  returnToWarehouse: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          await prisma.warehouse.update({
            where: { id: item.id },
            data: { assignedToId: null, status: 'AVAILABLE' },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED',
              performedById: userId,
              notes: input.notes,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const technicianItem = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })

          if (!technicianItem) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Material not found',
            })
          }

          // Delete or reduce technician item
          if (technicianItem.quantity <= item.quantity) {
            await prisma.warehouse.delete({ where: { id: item.id } })
          } else {
            await prisma.warehouse.update({
              where: { id: item.id },
              data: { quantity: { decrement: item.quantity } },
            })
          }

          // Add back to central warehouse
          const centralItem = await prisma.warehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              name: technicianItem.name,
              assignedToId: null,
            },
          })

          const targetId =
            centralItem?.id ??
            (
              await prisma.warehouse.create({
                data: {
                  itemType: 'MATERIAL',
                  name: technicianItem.name,
                  quantity: 0,
                  unit: technicianItem.unit,
                  index: technicianItem.index,
                  price: technicianItem.price,
                  category: technicianItem.category,
                  status: 'AVAILABLE',
                },
              })
            ).id

          await prisma.warehouse.update({
            where: { id: targetId },
            data: { quantity: { increment: item.quantity } },
          })

          // History zapisujemy dla centralnego ID
          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: targetId,
              action: 'RETURNED',
              performedById: userId,
              quantity: item.quantity,
              notes: input.notes,
            },
          })
        }
      }

      return { success: true }
    }),

  // 🔁 Return damaged/obsolete items back to the operator (not to warehouse)
  returnToOperator: roleProtectedProcedure(['WAREHOUSEMAN', 'ADMIN'])
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              assignedToId: null,
              status: 'RETURNED_TO_OPERATOR',
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              notes: input.notes,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const material = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })

          if (!material) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Material not found',
            })
          }

          if (material.quantity <= item.quantity) {
            await prisma.warehouse.update({
              where: { id: item.id },
              data: { quantity: 0 },
            })
          } else {
            await prisma.warehouse.update({
              where: { id: item.id },
              data: { quantity: { decrement: item.quantity } },
            })
          }

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              quantity: item.quantity,
              notes: input.notes,
            },
          })
        }
      }

      return { success: true }
    }),

  // 📦 Get all warehouse items
  getAll: protectedProcedure.query(() => {
    return prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }),

  // 📜 Get history for a specific warehouse item by id (devices)
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

  // 📜 Get all history entries by item name (for materials)
  getHistoryByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return prisma.warehouseHistory.findMany({
        where: {
          warehouseItem: {
            name: input.name,
          },
        },
        include: {
          performedBy: true,
          assignedTo: true,
          assignedOrder: true,
        },
        orderBy: { actionDate: 'desc' },
      })
    }),

  // ❌ Delete warehouse item and related history
  deleteItem: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      await prisma.warehouseHistory.deleteMany({
        where: { warehouseItemId: input.id },
      })
      await prisma.warehouse.delete({ where: { id: input.id } })

      return { success: true }
    }),

  // 📦 Get all items by name (grouped detail)
  getItemsByName: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => {
      return prisma.warehouse.findMany({
        where: { name: { equals: input.name.trim(), mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // 📦 Get all items + history by name
  getByNameWithHistory: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return prisma.warehouse.findMany({
        where: { name: input.name },
        include: {
          history: {
            include: { performedBy: true, assignedTo: true },
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
    .query(({ input }) => {
      return prisma.warehouse.findFirst({
        where: { serialNumber: { equals: input.serial, mode: 'insensitive' } },
        include: { assignedTo: true },
      })
    }),

  // 📜 Paginated and filterable warehouse history
  getWarehouseHistory: roleProtectedProcedure(['ADMIN', 'WAREHOUSEMAN'])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(30),
        actions: z.array(z.nativeEnum(WarehouseAction)).optional(),
        performerId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, actions, performerId, startDate, endDate } = input

      const whereClause: any = {
        ...(actions && actions.length > 0 ? { action: { in: actions } } : {}),
        ...(performerId ? { performedById: performerId } : {}),
        ...(startDate || endDate
          ? {
              actionDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      }

      const [data, total] = await Promise.all([
        prisma.warehouseHistory.findMany({
          where: whereClause,
          include: {
            warehouseItem: true,
            performedBy: true,
            assignedTo: true,
            assignedOrder: true,
          },
          orderBy: { actionDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.warehouseHistory.count({ where: whereClause }),
      ])

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    }),
  // 🔍 Get items assigned to tchnician
  getTechnicianStock: protectedProcedure
    .input(z.object({ technicianId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.warehouse.findMany({
        where: { assignedToId: input.technicianId },
      })
    }),
  // 🔍 Get device by serial number + last history entry
  checkDeviceBySerialNumber: protectedProcedure
    .input(z.object({ serialNumber: z.string().min(3) }))
    .query(async ({ input, ctx }) => {
      const item = await ctx.prisma.warehouse.findFirst({
        where: {
          serialNumber: input.serialNumber.trim(),
          itemType: WarehouseItemType.DEVICE,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          assignedOrder: { select: { id: true, orderNumber: true } },
          history: {
            orderBy: { actionDate: 'desc' },
            take: 1,
            select: { action: true, actionDate: true },
          },
        },
      })

      if (!item) throw new Error('Device not found')

      const last = item.history[0] // 👈 newest entry (if any)

      return {
        id: item.id,
        name: item.name,
        status: item.status,
        assignedTo: item.assignedTo,
        assignedOrder: item.assignedOrder,
        lastAction: last?.action ?? null,
        lastActionDate: last?.actionDate ?? null,
      }
    }),
})
